import type { FeedbackAnchor } from './ScreenUIContext';
import { STAR_COLUMN_RESERVE } from '../features/interests/StarButton.model';
import { MAX_CONTENT_WIDTH, TOPBAR_HEIGHT } from '../styling/tokens';

// ── The feedback toast: where it goes and what it shows ───────────────────────
//
// Where: next to what was tapped. After a share action, in the panel's
// "My schedule" heading; with nothing to sit next to, right under the top bar,
// clear of the now pill, in a band that stops short of the star column so it
// never covers a star. (A star press opens the star selector instead:
// features/interests/StarSelector.) What: the message with a spinner, a tick or
// a warning sign. A tap dismisses it, except while still in progress.

const TOAST_GUTTER = 12;
/** Space between the toast and the bar it sits under. */
const TOAST_GAP = 8;

/**
 * The horizontal band a toast may occupy. `centeredWidth` is the widest a
 * toast can be and still sit centred on the screen inside the band: a span
 * centred on the screen, ending at the band's right edge. A toast that fits is
 * centred; a wider one moves left only as far as it must.
 */
export function toastBand(
  screenWidth: number,
  insets: { left: number; right: number },
): { left: number; width: number; centeredWidth: number } {
  const columnWidth = Math.min(screenWidth, MAX_CONTENT_WIDTH);
  const columnLeft = (screenWidth - columnWidth) / 2;
  const left = Math.max(columnLeft, insets.left) + TOAST_GUTTER;
  const right = Math.min(columnLeft + columnWidth, screenWidth - insets.right) - STAR_COLUMN_RESERVE;
  const width = Math.max(0, right - left);
  const centeredWidth = Math.max(0, Math.min(2 * (right - screenWidth / 2), width));
  return { left, width, centeredWidth };
}

export type ToastLayout = {
  screenWidth: number;
  insets: { top: number; left: number; right: number };
  /** False in the short layout, where the top bar is dropped. */
  topBarShown: boolean;
};

export type ToastPlacement =
  /** Under the top bar, centred in the band as far as it fits. */
  | { kind: 'top'; left: number; width: number; centeredWidth: number; top: number }
  /** Drawn by the section it belongs to (SectionFeedbackToast), not over the screen. */
  | { kind: 'in-section' };

export function toastPlacement(anchor: FeedbackAnchor | undefined, layout: ToastLayout): ToastPlacement {
  if (anchor?.kind === 'my-schedule') {
    return { kind: 'in-section' };
  }
  const { screenWidth, insets, topBarShown } = layout;
  const belowTopBar = insets.top + (topBarShown ? TOPBAR_HEIGHT : 0);
  // The top inset is 0 in landscape, which would leave the toast flush against
  // the screen edge: keep a floor under it.
  return { kind: 'top', ...toastBand(screenWidth, insets), top: Math.max(belowTopBar, 12) + TOAST_GAP };
}
