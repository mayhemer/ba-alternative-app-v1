import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { clearTokens, loadTokens, saveTokens, type StoredTokens } from './tokenStorage';

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// The tokens are opaque strings to this app — they travel in an Authorization
// header and nothing here parses them — so fakes are as good as real ones.
// Cognito's validation is server-side and not this module's contract.

const EXPIRES_AT = Date.parse('2026-08-05T12:00:00+02:00');

const TOKENS: StoredTokens = {
  accessToken: 'fake.access.token',
  idToken: 'fake.id.token',
  refreshToken: 'fake.refresh.token',
  expiresAt: EXPIRES_AT,
  userId: 'cognito-sub-1234',
  email: 'tester@example.com',
  name: 'Test Person',
};

// Which storage the module reaches for is decided by Platform.OS, which the
// jest-expo preset sets — so the suite covers whichever platform it runs under
// rather than mocking the check.
const BACKING = Platform.OS === 'web' ? 'localStorage' : 'SecureStore';

describe(`tokenStorage on ${Platform.OS} (${BACKING})`, () => {
  it('round-trips a saved session', async () => {
    await saveTokens(TOKENS);

    expect(await loadTokens()).toEqual(TOKENS);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadTokens()).toBeNull();
  });

  it('does not clear storage just because nothing was stored', async () => {
    // Regression guard for the null-vs-undefined trap: a backing store that
    // answers `undefined` for a missing key slips past the `=== null` check,
    // throws inside JSON.parse and lands in the corrupt-entry branch — which
    // deletes. The call still returns null, so the mistake looks green.
    await saveTokens(TOKENS);
    await loadTokens();

    expect(await loadTokens()).toEqual(TOKENS);
  });

  it('forgets the session on clear', async () => {
    await saveTokens(TOKENS);
    await clearTokens();

    expect(await loadTokens()).toBeNull();
  });

  it('treats a corrupt entry as no session, and clears it', async () => {
    // iOS Keychain survives app reinstalls, so a stale or half-written entry
    // from an older build is a real case — failing on every launch is not an option.
    if (Platform.OS === 'web') {
      localStorage.setItem('auth_tokens', 'not json at all');
    } else {
      await SecureStore.setItemAsync('auth_tokens', 'not json at all');
    }

    expect(await loadTokens()).toBeNull();
    // Cleared, so the next launch does not retry the same broken entry.
    expect(await loadTokens()).toBeNull();
  });

  it('keeps the fields the session is rebuilt from', async () => {
    await saveTokens(TOKENS);
    const loaded = await loadTokens();

    // AuthContext reads these directly; losing one silently signs the user out
    // or drops their display name.
    expect(loaded?.userId).toBe(TOKENS.userId);
    expect(loaded?.email).toBe(TOKENS.email);
    expect(loaded?.name).toBe(TOKENS.name);
    expect(loaded?.expiresAt).toBe(EXPIRES_AT);
    expect(loaded?.refreshToken).toBe(TOKENS.refreshToken);
  });

  it('accepts a session with no display name', async () => {
    // Not every IdP returns one — Apple omits it after the first authorization.
    await saveTokens({ ...TOKENS, name: null });

    expect((await loadTokens())?.name).toBeNull();
  });
});
