// ── A box's left edge: how wide, and where a dotted one's dots go ─────────────
//
// Shared by My plan's set rows and the timeline's blocks: a pick's edge along
// the box's left side, solid or dotted, or none.
//
// Square dots as wide as the edge, one dot apart, as many as fit with a little
// room kept clear at each end, away from a box's rounded corners. Centred and
// on whole points, so both ends are whole dots on every box height, and sharp
// on every screen. (A native dotted border can't do this: on iOS it is one
// dotted stroke around the whole rounded box, so where its dots fall on the
// left side depends on the box's width, and the corners cut the end ones.)

/** The edge's width: a set row's, a timeline block's. */
export const LEFT_EDGE_WIDTH = 3;

/** Solid (a Must-see), dotted (a Maybe), or none. */
export type LeftEdgeKind = 'solid' | 'dotted' | null;

/** A dot's side, and the gap between two dots. */
const DOT = LEFT_EDGE_WIDTH;
const GAP = LEFT_EDGE_WIDTH;

/** Kept clear at each end, so no dot reaches into a rounded corner. */
const END_MARGIN = 2;

/** The top of each dot, from the box's top, for a box `height` tall. */
export function leftEdgeDots(height: number): number[] {
  const count = Math.max(0, Math.floor((height - 2 * END_MARGIN + GAP) / (DOT + GAP)));
  const span = count * DOT + Math.max(0, count - 1) * GAP;
  const top = Math.floor((height - span) / 2);
  return Array.from({ length: count }, (_, i) => top + i * (DOT + GAP));
}

/** The dots as one SVG path: a filled square per dot. */
export function leftEdgeDotsPath(height: number): string {
  return leftEdgeDots(height).map((y) => `M0 ${y}h${DOT}v${DOT}h-${DOT}z`).join('');
}
