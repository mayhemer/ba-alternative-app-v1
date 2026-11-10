import { LANGUAGE_NAMES, strings } from '../../i18n/strings';
import type { LanguageChoice } from '../../i18n/language';


// ── Settings: what it shows ───────────────────────────────────────────────────
//
// The account: a spinner while the session is being restored; signed in, the
// name over the email (or the email alone); signed out, the two sign-in
// buttons, which read "Signing in…" while busy, and the last error. Then the
// editions as a dropdown: the field shows the active one, the open list every
// edition with the active one marked. Last, the app language: the system's,
// English, Czech, the choice marked.

export type AccountModel =
  | { kind: 'restoring' }
  /** With a name: the name, bold, over the email; without: the email alone. */
  | { kind: 'signed-in'; title: string; subtitle: string | null }
  | { kind: 'signed-out'; error: string | null; busy: boolean; googleLabel: string; appleLabel: string };

export type AccountInputs = {
  isRestoringSession: boolean;
  isLoggedIn: boolean;
  name: string | null;
  email: string | null;
  isBusy: boolean;
  error: string | null;
};

export function accountModel({ isRestoringSession, isLoggedIn, name, email, isBusy, error }: AccountInputs): AccountModel {
  if (isRestoringSession) {
    return { kind: 'restoring' };
  }
  if (isLoggedIn) {
    return name !== null ? { kind: 'signed-in', title: name, subtitle: email ?? '' } : { kind: 'signed-in', title: email ?? '', subtitle: null };
  }
  const s = strings().settingsScreen;
  return {
    kind: 'signed-out',
    error,
    busy: isBusy,
    googleLabel: isBusy ? s.signingIn : s.signInWithGoogle,
    appleLabel: isBusy ? s.signingIn : s.signInWithApple,
  };
}

export type EditionRowModel = { key: string; label: string; active: boolean };

export type EditionDropdownModel = {
  /** The active edition, or a prompt while none of those offered is chosen. */
  fieldLabel: string;
  accessibilityLabel: string;
  options: EditionRowModel[];
};

export function editionDropdownModel(slugs: string[], selected: string | null): EditionDropdownModel {
  const options = slugs.map((slug) => ({ key: slug, label: slug.toUpperCase(), active: slug === selected }));
  const fieldLabel = options.find((option) => option.active)?.label ?? strings().settingsScreen.chooseEdition;
  return { fieldLabel, accessibilityLabel: strings().settingsScreen.editionAccessibilityLabel(fieldLabel), options };
}

// ── The app language ──────────────────────────────────────────────────────────
//
// Each language is named in itself (LANGUAGE_NAMES), so it reads the same in
// either; only the system's option is in the language the app shows.

export type LanguageRowModel = { key: LanguageChoice; label: string; active: boolean };

export function languageOptionsModel(choice: LanguageChoice): LanguageRowModel[] {
  return [
    { key: 'system', label: strings().settingsScreen.languageSystem, active: choice === 'system' },
    { key: 'en', label: LANGUAGE_NAMES.en, active: choice === 'en' },
    { key: 'cs', label: LANGUAGE_NAMES.cs, active: choice === 'cs' },
  ];
}

// ── The lock-screen now card (Android) ────────────────────────────────────────
//
// The app's own switch, as the system's notification permission allows it.
// Before the permission is asked the switch reads on: the card asks for it on
// the first festival day (shell/NowCardSync).

export type NowCardSwitchModel = { on: boolean; hint: string | null };

export function nowCardSwitchModel(enabled: boolean, permission: 'granted' | 'denied' | 'undetermined'): NowCardSwitchModel {
  if (!enabled) {
    return { on: false, hint: null };
  }
  if (permission === 'denied') {
    return { on: false, hint: strings().settingsScreen.notificationsOff };
  }
  return { on: true, hint: null };
}
