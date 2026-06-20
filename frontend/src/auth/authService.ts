import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { COGNITO, COGNITO_DISCOVERY } from './cognitoConfig';
import { type StoredTokens, saveTokens, loadTokens } from './tokenStorage';

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

  const request = new AuthSession.AuthRequest({
    clientId: COGNITO.clientId,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
    usePKCE: true,
    extraParams: { identity_provider: provider },
  });

  const result = await request.promptAsync(COGNITO_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('cancelled');
  }
  if (result.type !== 'success') {
    throw new Error('auth_failed');
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: COGNITO.clientId,
      redirectUri,
      code: result.params.code,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    COGNITO_DISCOVERY,
  );

  const tokens = tokensFromResponse(tokenResponse);
  await saveTokens(tokens);
  return tokens;
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
