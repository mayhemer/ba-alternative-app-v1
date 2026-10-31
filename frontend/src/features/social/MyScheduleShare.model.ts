// ── "My schedule": what it shows ──────────────────────────────────────────────
//
// The section both the lens panel and My plan's filter panel end with: a
// sign-in prompt while signed out, else the share action ("Share again" once
// shared), with Copy link and Revoke while a share exists.

export type MyScheduleShareModel =
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; shareLabel: string; canCopyOrRevoke: boolean };

type Inputs = { isLoggedIn: boolean; hasShare: boolean };

export function myScheduleShareModel({ isLoggedIn, hasShare }: Inputs): MyScheduleShareModel {
  if (!isLoggedIn) {
    return { kind: 'signed-out' };
  }
  return { kind: 'signed-in', shareLabel: hasShare ? 'Share again' : 'Share my schedule', canCopyOrRevoke: hasShare };
}
