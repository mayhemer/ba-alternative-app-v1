// ── Conflict stripes ──────────────────────────────────────────────────────────
//
// The hatch drawn over a clash: on a timeline block's conflict bars, a day
// button's clash mark and a My plan row's clash bar.

export const CONFLICT_STRIPE = 2; // perpendicular width of each 45° dark-red band

// Horizontal spacing between stripe start points. At 45° the perpendicular gap
// is step/√2, so stepping by 2·stripe·√2 makes bands and gaps equally wide.
const CONFLICT_STRIPE_STEP = CONFLICT_STRIPE * 2 * Math.SQRT2;

/**
 * 45° hazard stripes across a w×h box, as one path of parallel segments.
 *
 * Drawn explicitly rather than with <Pattern patternTransform="rotate(45)">:
 * react-native-svg discards patternTransform on iOS — RNSVGPainter applies its
 * `_transform` only in paintLinearGradient/paintRadialGradient, never in
 * paintPattern — so the rotation never reached the tiling and the stripes came
 * out as repeating fragments. One Path keeps this to a single SVG node.
 */
export function stripePath(w: number, h: number): string {
  let d = '';
  // Start a full box-height to the left so the first stripes still cross x=0.
  for (let x = -h; x < w; x += CONFLICT_STRIPE_STEP) {
    d += `M${x.toFixed(2)},${h} L${(x + h).toFixed(2)},0 `;
  }
  return d;
}
