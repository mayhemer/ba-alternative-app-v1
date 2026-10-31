import { myScheduleShareModel } from './MyScheduleShare.model';

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
