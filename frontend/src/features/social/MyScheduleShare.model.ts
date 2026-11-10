import { strings } from '../../i18n/strings';


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
  return { kind: 'signed-in', shareLabel: hasShare ? strings().myScheduleShare.shareAgain : strings().myScheduleShare.share, canCopyOrRevoke: hasShare };
}

/** What the toast says after Copy link: only the outcome, never the link itself. */
export function copyLinkFeedback(copied: boolean): { text: string; variant: 'confirmation' | 'warning' } {
  return copied
    ? { text: strings().myScheduleShare.linkCopied, variant: 'confirmation' }
    : { text: strings().myScheduleShare.copyFailed, variant: 'warning' };
}
