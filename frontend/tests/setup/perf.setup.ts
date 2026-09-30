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

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  }),
}));
