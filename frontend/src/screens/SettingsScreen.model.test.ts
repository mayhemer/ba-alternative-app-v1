import { accountModel, editionRowModels, type AccountInputs } from './SettingsScreen.model';

// ── Settings, configured ──────────────────────────────────────────────────────
//
// Dimensions: the session restoring, signed in (with or without a name) or out
// (busy, with an error); the editions and the active one.

const base: AccountInputs = { isRestoringSession: false, isLoggedIn: false, name: null, email: null, isBusy: false, error: null };

describe('accountModel', () => {
  it('waits while the session is restored', () => {
    expect(accountModel({ ...base, isRestoringSession: true, isLoggedIn: true })).toEqual({ kind: 'restoring' });
  });

  it('shows the name over the email when signed in with a name', () => {
    expect(accountModel({ ...base, isLoggedIn: true, name: 'Anna', email: 'a@x.cz' })).toEqual({ kind: 'signed-in', title: 'Anna', subtitle: 'a@x.cz' });
  });

  it('shows the email alone without a name', () => {
    expect(accountModel({ ...base, isLoggedIn: true, email: 'a@x.cz' })).toEqual({ kind: 'signed-in', title: 'a@x.cz', subtitle: null });
  });

  it('offers both sign-ins while signed out, with the last error', () => {
    expect(accountModel({ ...base, error: 'Sign-in failed. Please try again.' })).toEqual({
      kind: 'signed-out', error: 'Sign-in failed. Please try again.', busy: false, googleLabel: 'Sign in with Google', appleLabel: 'Sign in with Apple',
    });
  });

  it('says "Signing in…" on both while busy', () => {
    expect(accountModel({ ...base, isBusy: true })).toMatchObject({ busy: true, googleLabel: 'Signing in…', appleLabel: 'Signing in…' });
  });
});

describe('editionRowModels', () => {
  it('lists the editions in capitals, the active one marked', () => {
    expect(editionRowModels(['ba2025', 'ba2027'], 'ba2027')).toEqual([
      { key: 'ba2025', label: 'BA2025', active: false },
      { key: 'ba2027', label: 'BA2027', active: true },
    ]);
  });

  it('marks none while no edition is chosen', () => {
    expect(editionRowModels(['ba2025'], null).map((r) => r.active)).toEqual([false]);
  });
});
