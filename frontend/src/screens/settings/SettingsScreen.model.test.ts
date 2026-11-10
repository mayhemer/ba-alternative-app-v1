import { accountModel, editionDropdownModel, languageOptionsModel, nowCardSwitchModel, type AccountInputs } from './SettingsScreen.model';
import { setLanguageChoice } from '../../i18n/language';

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

describe('editionDropdownModel', () => {
  it('shows the active edition in the field and lists every edition in capitals, the active one marked', () => {
    expect(editionDropdownModel(['ba2025', 'ba2027'], 'ba2027')).toEqual({
      fieldLabel: 'BA2027',
      accessibilityLabel: 'Festival edition, BA2027',
      options: [
        { key: 'ba2025', label: 'BA2025', active: false },
        { key: 'ba2027', label: 'BA2027', active: true },
      ],
    });
  });

  it('asks to choose, marking none, while no edition is chosen', () => {
    const model = editionDropdownModel(['ba2025'], null);
    expect(model.fieldLabel).toBe('Choose an edition');
    expect(model.accessibilityLabel).toBe('Festival edition, Choose an edition');
    expect(model.options.map((r) => r.active)).toEqual([false]);
  });

  it('asks to choose when the chosen edition is not among those offered', () => {
    expect(editionDropdownModel(['ba2025'], 'ba2018').fieldLabel).toBe('Choose an edition');
  });
});

// ── The lock-screen now card switch (Android) ─────────────────────────────────
//
// Dimensions: the app's own switch (on, off); the system's notification
// permission (granted, denied, not asked yet).

describe('nowCardSwitchModel', () => {
  it('is on while switched on and allowed', () => {
    expect(nowCardSwitchModel(true, 'granted')).toEqual({ on: true, hint: null });
  });

  it('is on before the permission was asked: the card asks on the first festival day', () => {
    expect(nowCardSwitchModel(true, 'undetermined')).toEqual({ on: true, hint: null });
  });

  it('is off, saying why, when the system blocks notifications', () => {
    expect(nowCardSwitchModel(true, 'denied')).toEqual({ on: false, hint: 'Notifications are off for this app in the system settings.' });
  });

  it('is off when switched off, whatever the permission', () => {
    expect(nowCardSwitchModel(false, 'granted')).toEqual({ on: false, hint: null });
    expect(nowCardSwitchModel(false, 'denied')).toEqual({ on: false, hint: null });
  });
});

// ── The app language ──────────────────────────────────────────────────────────
//
// Dimensions: the choice (the system's, English, Czech); the language the app
// shows (English, Czech).

describe('languageOptionsModel', () => {
  afterEach(() => { setLanguageChoice('system'); });

  it('offers the system\'s language, English and Czech, the choice marked', () => {
    expect(languageOptionsModel('system')).toEqual([
      { key: 'system', label: 'System default', active: true },
      { key: 'en', label: 'English', active: false },
      { key: 'cs', label: 'Čeština', active: false },
    ]);
    expect(languageOptionsModel('cs').map((row) => row.active)).toEqual([false, false, true]);
    expect(languageOptionsModel('en').map((row) => row.active)).toEqual([false, true, false]);
  });

  it('names each language in itself, whatever the app shows', () => {
    setLanguageChoice('cs');
    expect(languageOptionsModel('cs').map((row) => row.label)).toEqual(['Podle systému', 'English', 'Čeština']);
  });
});
