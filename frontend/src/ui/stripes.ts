// ── 45° stripes ───────────────────────────────────────────────────────────────
//
// The hatch drawn over a clash: on a timeline block's conflict bars, a day
// button's clash mark and a My plan row's clash bar. These rise, "/". My plan's
// past rows use the same path falling, "\", wider apart and faint, so the two
// never read alike.

export const CONFLICT_STRIPE = 2; // perpendicular width of each 45° dark-red band

// Horizontal spacing between stripe start points. At 45° the perpendicular gap
// is step/√2, so stepping by 2·stripe·√2 makes bands and gaps equally wide.
const CONFLICT_STRIPE_STEP = CONFLICT_STRIPE * 2 * Math.SQRT2;

type StripeOptions = {
  /** Horizontal spacing between stripe starts; the clash stripes' by default. */
  step?: number;
  /** Falling, top-left to bottom-right ("\"), instead of rising ("/"). */
  falling?: boolean;
};

/**
 * 45° stripes across a w×h box, as one path of parallel segments.
 *
 * Drawn explicitly rather than with <Pattern patternTransform="rotate(45)">:
 * react-native-svg discards patternTransform on iOS — RNSVGPainter applies its
 * `_transform` only in paintLinearGradient/paintRadialGradient, never in
 * paintPattern — so the rotation never reached the tiling and the stripes came
 * out as repeating fragments. One Path keeps this to a single SVG node.
 */
export function stripePath(w: number, h: number, { step = CONFLICT_STRIPE_STEP, falling = false }: StripeOptions = {}): string {
  const [fromY, toY] = falling ? [0, h] : [h, 0];
  let d = '';
  // Start a full box-height to the left so the first stripes still cross x=0.
  for (let x = -h; x < w; x += step) {
    d += `M${x.toFixed(2)},${fromY} L${(x + h).toFixed(2)},${toY} `;
  }
  return d;
}
