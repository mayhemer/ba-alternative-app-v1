import { feedbackToastModel, toastBand, toastPlacement } from './FeedbackToast.model';
import { TOPBAR_HEIGHT } from '../styling/tokens';

// ── The toast's content, as a model ───────────────────────────────────────────
//
// That it never covers a star (toastBand) is tested in FeedbackToast.test.tsx.

describe('feedbackToastModel', () => {
  it('shows the message with its icon, and can be tapped away once done', () => {
    expect(feedbackToastModel({ text: 'Link copied', variant: 'confirmation' }))
      .toEqual({ content: { text: 'Link copied', icon: 'confirmation' }, tappable: true });
  });

  it('cannot be tapped away while still in progress', () => {
    expect(feedbackToastModel({ text: 'Saving', variant: 'progress' }).tappable).toBe(false);
  });
});

// ── Where the toast goes ──────────────────────────────────────────────────────
//
// Next to what was tapped: in the panel's "My schedule" heading after a share
// action. With nothing on screen to sit next to (an opened share link), right
// under the top bar, so the now pill in it stays visible. (A star tap opens the
// star selector instead: features/interests/StarSelector.)

const PHONE = { screenWidth: 390, insets: { top: 47, bottom: 34, left: 0, right: 0 }, topBarShown: true };
const SHORT = { screenWidth: 844, insets: { top: 0, bottom: 21, left: 47, right: 47 }, topBarShown: false };

describe('toastPlacement', () => {
  it('goes under the top bar, not over the now pill, with nothing to sit next to', () => {
    const placement = toastPlacement(undefined, PHONE);

    expect(placement).toEqual({ kind: 'top', ...toastBand(390, PHONE.insets), top: expect.any(Number) });
    expect(placement.kind === 'top' && placement.top).toBeGreaterThanOrEqual(PHONE.insets.top + TOPBAR_HEIGHT);
  });

  it('goes to the top of the screen when there is no top bar', () => {
    const placement = toastPlacement(undefined, SHORT);

    expect(placement.kind === 'top' && placement.top).toBeLessThan(TOPBAR_HEIGHT);
  });

  it('leaves a My schedule message to that section', () => {
    expect(toastPlacement({ kind: 'my-schedule' }, PHONE)).toEqual({ kind: 'in-section' });
  });
});
