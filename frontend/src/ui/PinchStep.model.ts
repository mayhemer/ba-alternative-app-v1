// ── A pinch as steps: when one counts, and which way ──────────────────────────
//
// A pinch is read in steps, like a zoom with stops: each time its scale, taken
// from where the last step was (ui/usePinchSteps), passes a threshold, that is
// a step in (fingers together) or out (fingers apart). The thresholds sit as
// far from rest either way on a zoom's (log) scale, 1.41× out and its inverse
// in, far enough that a two-finger scroll or a resting hand does not step.

export type PinchDirection = 'in' | 'out';

/** At or below: a pinch in. */
export const PINCH_IN_SCALE = 0.71;
/** At or above: a pinch out. */
export const PINCH_OUT_SCALE = 1.41;

/** The step a pinch at `scale` (1 where the last step was) makes, or null while short of both thresholds. */
export function pinchDirection(scale: number): PinchDirection | null {
  if (scale <= PINCH_IN_SCALE) { return 'in'; }
  if (scale >= PINCH_OUT_SCALE) { return 'out'; }
  return null;
}
