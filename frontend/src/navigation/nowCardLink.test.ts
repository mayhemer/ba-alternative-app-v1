import { isNowCardLink, NOW_CARD_URL } from './nowCardLink';

// ── The lock-screen now card's tap link ───────────────────────────────────────
//
// A tap on the card (iOS Live Activity, Android notification) opens the app
// with NOW_CARD_URL; only that link opens My plan at now.

describe('isNowCardLink', () => {
  it('is the card\'s own link', () => {
    expect(NOW_CARD_URL).toBe('ba://my-plan/now');
    expect(isNowCardLink('ba://my-plan/now')).toBe(true);
  });

  it('allows a trailing slash or a query the OS may add', () => {
    expect(isNowCardLink('ba://my-plan/now/')).toBe(true);
    expect(isNowCardLink('ba://my-plan/now?source=card')).toBe(true);
  });

  it('is not another app link', () => {
    expect(isNowCardLink('ba://add-friend/0123')).toBe(false);
    expect(isNowCardLink('ba://my-plan')).toBe(false);
    expect(isNowCardLink('ba://my-plan/nowhere')).toBe(false);
    expect(isNowCardLink('https://ba.janbambas.cz/my-plan/now')).toBe(false);
  });

  it('is not a missing link', () => {
    expect(isNowCardLink(null)).toBe(false);
  });
});
