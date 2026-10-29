// ── The artist sheet's hero image: its size ───────────────────────────────────
//
// 3:2 of the content width, capped at the viewport's height. The cap only binds
// in landscape; the image is drawn `contain` in a box the full content width, so
// on a wide screen it is the box's height that limits it, and a lower cap would
// only shrink the image and pad its sides.

const HERO_ASPECT = 0.666;
const HERO_MAX_VIEWPORT_FRACTION = 1;

export function heroHeight(contentWidth: number, viewportHeight: number): number {
  return Math.round(Math.min(contentWidth * HERO_ASPECT, viewportHeight * HERO_MAX_VIEWPORT_FRACTION));
}
