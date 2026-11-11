import { ROW_EDGE_WIDTH } from './planStyles';

// ── A Maybe row's dotted left edge: where its dots go ─────────────────────────
//
// Square dots as wide as the edge, one dot apart, as many as fit with a little
// room kept clear at each end, away from the row's rounded corners. Centred and
// on whole points, so both ends are whole dots on every row height, and sharp
// on every screen. (A native dotted border can't do this: on iOS it is one
// dotted stroke around the whole rounded box, so where its dots fall on the
// left side depends on the row's width, and the corners cut the end ones.)

/** A dot's side, and the gap between two dots. */
const DOT = ROW_EDGE_WIDTH;
const GAP = ROW_EDGE_WIDTH;

/** Kept clear at each end, so no dot reaches into a rounded corner. */
const END_MARGIN = 2;

/** The top of each dot, from the row's top, for a row `height` tall. */
export function rowEdgeDots(height: number): number[] {
  const count = Math.max(0, Math.floor((height - 2 * END_MARGIN + GAP) / (DOT + GAP)));
  const span = count * DOT + Math.max(0, count - 1) * GAP;
  const top = Math.floor((height - span) / 2);
  return Array.from({ length: count }, (_, i) => top + i * (DOT + GAP));
}

/** The dots as one SVG path: a filled square per dot. */
export function rowEdgeDotsPath(height: number): string {
  return rowEdgeDots(height).map((y) => `M0 ${y}h${DOT}v${DOT}h-${DOT}z`).join('');
}
