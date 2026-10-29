import type { InterestStatus } from '../features/interests/InterestContext';
import type { FeedbackMessage, FeedbackVariant } from './ScreenUIContext';
import { STAR_COLUMN_RESERVE } from '../features/interests/StarButton.model';
import { MAX_CONTENT_WIDTH } from '../styling/tokens';

// ── The feedback toast: where it goes and what it shows ───────────────────────
//
// Where: a band at the top of the content column that stops short of the star
// column, so a toast shown right after a star tap never covers a star. What:
// after a star tap, the interest cycle strip (a failure to save beside it);
// otherwise the message with a spinner, a tick or a warning sign. A tap
// dismisses it, except while it is still in progress.

const TOAST_GUTTER = 12;

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

export type FeedbackToastContent =
  | { kind: 'interest'; status: InterestStatus; failed: boolean }
  | { kind: 'text'; text: string; icon: FeedbackVariant };

export type FeedbackToastModel = { content: FeedbackToastContent; tappable: boolean };

export function feedbackToastModel(feedback: FeedbackMessage): FeedbackToastModel {
  return {
    content: feedback.interest !== undefined
      ? { kind: 'interest', status: feedback.interest, failed: feedback.variant === 'warning' }
      : { kind: 'text', text: feedback.text, icon: feedback.variant },
    tappable: feedback.variant !== 'progress',
  };
}
