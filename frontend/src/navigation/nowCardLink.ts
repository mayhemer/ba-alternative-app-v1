// ── The lock-screen now card's tap link ───────────────────────────────────────
//
// The card (iOS Live Activity's widgetURL, Android notification's content
// intent) opens the app with this link; shell/useNowCardLinkHandler answers it
// by opening My plan at now. The native side has the same string
// (modules/now-card), so change both together.

export const NOW_CARD_URL = 'ba://my-plan/now';

/** Whether `url` is the card's link; a trailing slash or a query the OS adds is allowed. */
export function isNowCardLink(url: string | null): boolean {
  if (url === null) {
    return false;
  }
  const path = url.split(/[?#]/)[0].replace(/\/$/, '');
  return path === NOW_CARD_URL;
}
