import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { COGNITO, COGNITO_DISCOVERY } from './cognitoConfig';
import { type StoredTokens, saveTokens, loadTokens } from './tokenStorage';

// ── Dev-only logging ────────────────────────────────────────────────────────────
// These payloads can include the OAuth authorization code, token-presence flags,
// and PII (email). In release builds console output is written to the device
// system log (readable via Console.app / sysdiagnose), so it must never run there.
function devLog(...args: unknown[]): void {
  if (__DEV__) { console.log(...args); }
}
function devError(...args: unknown[]): void {
  if (__DEV__) { console.error(...args); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Decodes the payload segment of a JWT without signature verification.
// Safe here because we only call this on tokens we just received from Cognito
// over a verified HTTPS + PKCE exchange.
function parseJwtPayload(token: string): Record<string, unknown> {
  const base64url = token.split('.')[1];
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function makeRedirectUri(): string {
  if (Platform.OS === 'web') {
    // On web the popup redirects back to the app root (no path), so no server
    // route is needed. makeRedirectUri with no path returns window.location.origin.
    return AuthSession.makeRedirectUri({ scheme: 'ba' });
  }
  // On native, ba://auth/callback is a custom URL scheme intercepted by the OS —
  // no HTTP server involved, so the path is fine and arbitrary.
  return AuthSession.makeRedirectUri({ scheme: 'ba', path: 'auth/callback' });
}

// Derives a display name from the id token claims: prefers the single 'name'
// claim, else joins given_name + family_name. Returns null when none are present
// (e.g. Apple only sends the name on the user's first-ever authorization).
function nameFromClaims(payload: Record<string, unknown>): string | null {
  const asString = (key: string): string =>
    typeof payload[key] === 'string' ? (payload[key] as string).trim() : '';
  const full = asString('name');
  if (full !== '') { return full; }
  const joined = `${asString('given_name')} ${asString('family_name')}`.trim();
  return joined !== '' ? joined : null;
}

function tokensFromResponse(
  response: AuthSession.TokenResponse,
  existingRefreshToken?: string,
): StoredTokens {
  const idPayload = parseJwtPayload(response.idToken!);
  return {
    accessToken: response.accessToken,
    idToken: response.idToken!,
    // Cognito only issues a new refresh token on full sign-in, not on refresh grants.
    refreshToken: response.refreshToken ?? existingRefreshToken ?? '',
    expiresAt: Date.now() + (response.expiresIn ?? 3600) * 1000,
    userId: idPayload['sub'] as string,
    email: idPayload['email'] as string,
    name: nameFromClaims(idPayload),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SocialProvider = 'Google' | 'SignInWithApple';

/**
 * Runs the Cognito Hosted UI PKCE flow for the given social provider.
 * Opens an in-app browser (ASWebAuthenticationSession on iOS/macOS,
 * Chrome Custom Tabs on Android, window.open on web).
 * Returns stored tokens on success; throws on cancel or failure.
 */
export async function signIn(provider: SocialProvider): Promise<StoredTokens> {
  const redirectUri = makeRedirectUri();
  devLog('[auth] signIn start', { provider, redirectUri, platform: Platform.OS });

  const request = new AuthSession.AuthRequest({
    clientId: COGNITO.clientId,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
    usePKCE: true,
    extraParams: { identity_provider: provider },
  });

  const result = await request.promptAsync(COGNITO_DISCOVERY);
  // Log the whole result shape — the useful failure detail lives in
  // result.error / result.params.error / result.params.error_description,
  // which Cognito populates on the redirect back to the app.
  devLog('[auth] promptAsync result', JSON.stringify(result, null, 2));

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('cancelled');
  }
  if (result.type !== 'success') {
    // result.type is 'error' (or 'locked'): surface the real reason.
    const params = (result as { params?: Record<string, string> }).params ?? {};
    const authError = (result as { error?: { message?: string; code?: string } }).error;
    const detail =
      params.error_description ?? params.error ?? authError?.message ?? authError?.code ?? result.type;
    devError('[auth] authorization failed', { type: result.type, params, authError });
    throw new Error(`auth_failed: ${detail}`);
  }

  if (result.params.error !== undefined) {
    // Some IdPs redirect back with type 'success' but an error in the params.
    devError('[auth] authorization returned error param', result.params);
    throw new Error(`auth_failed: ${result.params.error_description ?? result.params.error}`);
  }

  let tokenResponse: AuthSession.TokenResponse;
  try {
    devLog('[auth] exchanging code for tokens…');
    tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: COGNITO.clientId,
        redirectUri,
        code: result.params.code,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      COGNITO_DISCOVERY,
    );
  } catch (err) {
    devError('[auth] token exchange failed', err);
    throw new Error(`token_exchange_failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const tokens = tokensFromResponse(tokenResponse);
    await saveTokens(tokens);
    devLog('[auth] signIn success', { userId: tokens.userId, email: tokens.email });
    return tokens;
  } catch (err) {
    devError('[auth] failed to parse/store tokens', err, {
      hasIdToken: tokenResponse.idToken !== undefined,
      hasAccessToken: tokenResponse.accessToken !== undefined,
    });
    throw new Error(`token_parse_failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Silently refreshes an expired session using the stored refresh token.
 * Returns new tokens on success, null if the refresh token is invalid/expired.
 */
export async function refreshTokens(refreshToken: string): Promise<StoredTokens | null> {
  try {
    const tokenResponse = await AuthSession.refreshAsync(
      { clientId: COGNITO.clientId, refreshToken },
      COGNITO_DISCOVERY,
    );
    const tokens = tokensFromResponse(tokenResponse, refreshToken);
    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

const SESSION_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Loads stored tokens and validates/refreshes them.
 * Returns valid tokens or null if no session exists or refresh fails.
 * Called once on app launch.
 */
export async function tryRestoreSession(): Promise<StoredTokens | null> {
  const stored = await loadTokens();
  if (stored === null) { return null; }
  if (stored.expiresAt - Date.now() > SESSION_EXPIRY_BUFFER_MS) { return stored; }
  return refreshTokens(stored.refreshToken);
}

export { SESSION_EXPIRY_BUFFER_MS };
