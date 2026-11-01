// ── Perf-suite setup ──────────────────────────────────────────────────────────
//
// Render scenarios mount real feature providers, but two of their dependencies
// are boundaries rather than subjects: the slug source (AppProvider resolves it
// asynchronously from storage, which has nothing to do with render counts) and
// the session. Both are replaced here so every perf test gets them, rather than
// repeating the mocks per file.

export const PERF_SLUG = 'ba2025';

jest.mock('../../src/store/AppContext', () => {
  const actual = jest.requireActual('../../src/store/AppContext');
  return {
    ...actual,
    useSelectedSlug: () => 'ba2025',
    useAppState: () => ({ selectedSlug: 'ba2025', isLoading: false, lastError: null }),
  };
});

// One auth value for the whole run, as the real provider memoises its own: new
// functions on every call would make each render of InterestProvider rebuild
// its callbacks and render their stable readers, which the app never does.
jest.mock('../../src/auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});
