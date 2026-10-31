import { copyLinkFeedback, myScheduleShareModel } from './MyScheduleShare.model';

// ── "My schedule", configured ─────────────────────────────────────────────────
//
// Dimensions: signed in or out; a share made or not.

describe('my schedule', () => {
  it('asks to sign in while signed out, shared or not', () => {
    expect(myScheduleShareModel({ isLoggedIn: false, hasShare: false })).toEqual({ kind: 'signed-out' });
    expect(myScheduleShareModel({ isLoggedIn: false, hasShare: true })).toEqual({ kind: 'signed-out' });
  });

  it('offers to share, then to share again with Copy and Revoke once shared', () => {
    expect(myScheduleShareModel({ isLoggedIn: true, hasShare: false })).toEqual({ kind: 'signed-in', shareLabel: 'Share my schedule', canCopyOrRevoke: false });
    expect(myScheduleShareModel({ isLoggedIn: true, hasShare: true })).toEqual({ kind: 'signed-in', shareLabel: 'Share again', canCopyOrRevoke: true });
  });
});

// ── What Copy link says ───────────────────────────────────────────────────────
//
// Only the outcome, never the link itself: the toast sits in the panel's
// heading, and a whole URL would not fit there.

describe('copyLinkFeedback', () => {
  it('says only "Link copied" once the link is on the clipboard', () => {
    expect(copyLinkFeedback(true)).toEqual({ text: 'Link copied', variant: 'confirmation' });
  });

  it('says it could not copy, rather than showing the link, when nothing was copied', () => {
    expect(copyLinkFeedback(false)).toEqual({ text: 'Could not copy the link', variant: 'warning' });
  });
});
