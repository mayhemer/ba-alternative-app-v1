import { formatDuration, formatRemaining } from './planStrings';
import type { DbEvent } from '../../types/backend';

// ── A gap between sets: what it shows ─────────────────────────────────────────
//
// Everything a gap shows comes from one pair of times: where it starts, and the
// start of the set listed right under it. Its height, its label ("2 h", or while
// current "−1 h 20"), the blue fill and the now arrow cannot disagree.

export const GAP_LAYOUT = {
  /** Fits the label. */
  minHeight: 20,
  maxHeight: 160,
  pxPerMinute: 0.5,
  /** A current gap is at least this tall, to fit its countdown. */
  currentMinHeight: 44,
} as const;

const MINUTE_MS = 60 * 1000;

/**
 * Height of a gap: a floor that always fits its label, then linear, so a 35 min
 * gap (38) and a 2 h one (80) read clearly apart. Compressing curves (√, ln)
 * were tried and made them look alike.
 */
export function gapHeight(minutes: number): number {
  return Math.round(Math.min(GAP_LAYOUT.maxHeight, GAP_LAYOUT.minHeight + GAP_LAYOUT.pxPerMinute * minutes));
}

export type PlanGapModel = {
  kind: 'gap';
  key: string;
  /** The day-start break (08:00 → the first listed set): drawn with the start ring. */
  opening: boolean;
  /** "Now" falls inside it. */
  current: boolean;
  /** Its length, or while current the time left: "2 h", "−1 h 20". */
  label: string;
  /** Current, and a Maybe is listed under it: the countdown is drawn smaller, in a dashed box. */
  countdownToMaybe: boolean;
  height: number;
  /** Elapsed fraction while current, else 0: the blue fill. */
  progress: number;
  /** The now arrow's centre from the gap's top while current, else null. */
  nowY: number | null;
  /** The first set of the clash group right under it: the "Conflict" title it draws. */
  conflictTitle: DbEvent | null;
};

/** The gap from `from` to the start of `next`, the set listed right under it, picked at `nextLevel`. */
export function planGapModel(
  key: string,
  from: number,
  next: DbEvent,
  now: number,
  opening: boolean,
  nextLevel: 'will_go' | 'maybe' = 'will_go',
): PlanGapModel {
  const to = next.dateFrom;
  const minutes = Math.round((to - from) / MINUTE_MS);
  if (now < from || now >= to) {
    return { kind: 'gap', key, opening, current: false, label: formatDuration(to - from), countdownToMaybe: false, height: gapHeight(minutes), progress: 0, nowY: null, conflictTitle: null };
  }
  const height = Math.max(GAP_LAYOUT.currentMinHeight, gapHeight(minutes));
  const progress = (now - from) / (to - from);
  return {
    kind: 'gap',
    key,
    opening,
    current: true,
    label: formatRemaining(to - now),
    countdownToMaybe: nextLevel === 'maybe',
    height,
    progress,
    nowY: progress * height,
    conflictTitle: null,
  };
}
