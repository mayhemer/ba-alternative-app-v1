// ── Settings: what it shows ───────────────────────────────────────────────────
//
// The account: a spinner while the session is being restored; signed in, the
// name over the email (or the email alone); signed out, the two sign-in
// buttons, which read "Signing in…" while busy, and the last error. Then the
// editions, the active one marked.

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
  return {
    kind: 'signed-out',
    error,
    busy: isBusy,
    googleLabel: isBusy ? 'Signing in…' : 'Sign in with Google',
    appleLabel: isBusy ? 'Signing in…' : 'Sign in with Apple',
  };
}

export type EditionRowModel = { key: string; label: string; active: boolean };

export function editionRowModels(slugs: string[], selected: string | null): EditionRowModel[] {
  return slugs.map((slug) => ({ key: slug, label: slug.toUpperCase(), active: slug === selected }));
}
