import type { LensScope } from '../../utils/interestUtils';

// ── The lens panel: what it shows ─────────────────────────────────────────────
//
// "Show": everything, my picks, then each friend — the active source marked; a
// friend's row armed for removal (after a tap on its ✕) offers Cancel / Remove,
// one row at a time. "My schedule": a sign-in prompt while signed out, else the
// share action ("Share again" once shared), with Copy link and Revoke while a
// share exists.

export type LensScopeRowModel = {
  /** `all`, `me`, or the friend's token. */
  key: string;
  /** What choosing the row shows. */
  scope: LensScope;
  label: string;
  /** A friend's row draws the avatar and the ✕ / Cancel · Remove controls. */
  friend: { token: string; avatarUrl?: string; confirming: boolean } | null;
  active: boolean;
};

export type LensPanelModel = {
  rows: LensScopeRowModel[];
  mySchedule:
    | { kind: 'signed-out' }
    | { kind: 'signed-in'; shareLabel: string; canCopyOrRevoke: boolean };
};

export type LensPanelInputs = {
  scope: LensScope;
  friends: { token: string; label: string; avatarUrl?: string }[];
  /** The friend whose removal is armed, if any. */
  pendingRemove: string | null;
  isLoggedIn: boolean;
  hasShare: boolean;
};

export function lensPanelModel({ scope, friends, pendingRemove, isLoggedIn, hasShare }: LensPanelInputs): LensPanelModel {
  const rows: LensScopeRowModel[] = [
    { key: 'all', scope: { kind: 'all' }, label: 'Everything', friend: null, active: scope.kind === 'all' },
    { key: 'me', scope: { kind: 'me', level: null }, label: 'My picks', friend: null, active: scope.kind === 'me' },
    ...friends.map((f) => ({
      key: f.token,
      scope: { kind: 'friend', token: f.token, level: null } as LensScope,
      label: f.label,
      friend: { token: f.token, avatarUrl: f.avatarUrl, confirming: pendingRemove === f.token },
      active: scope.kind === 'friend' && scope.token === f.token,
    })),
  ];
  return {
    rows,
    mySchedule: isLoggedIn
      ? { kind: 'signed-in', shareLabel: hasShare ? 'Share again' : 'Share my schedule', canCopyOrRevoke: hasShare }
      : { kind: 'signed-out' },
  };
}
