// ── The order list: where its rows are, and where a dragged one drops ─────────
//
// The rows are stacked by hand (absolutely), so a dragged row can float over the
// others while the rows between its start and where it would drop step aside.

/** A row's height and the space under it; one row down is their sum. */
export const LANE_ORDER_ROW = { height: 48, gap: 6 };

const PITCH = LANE_ORDER_ROW.height + LANE_ORDER_ROW.gap;

/** A drag in progress: the row's place when it was picked up, and where it would drop. */
export type LaneDrag = { from: number; target: number };

/**
 * Where a row picked up at `from` and moved `dy` down (up when negative) drops,
 * among `count` rows: the nearest place, from half a row on; never past the ends.
 */
export function dropIndex(from: number, dy: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(from + dy / PITCH)));
}

/**
 * The top of the row listed at `index`. While a row is dragged, the rows between
 * its start and its target step one place towards the start, freeing the target.
 */
export function slotTop(index: number, drag: LaneDrag | null): number {
  if (drag !== null) {
    if (drag.from < index && index <= drag.target) {
      return (index - 1) * PITCH;
    }
    if (drag.target <= index && index < drag.from) {
      return (index + 1) * PITCH;
    }
  }
  return index * PITCH;
}

/** The order with the lane at `from` moved to `to`. */
export function moveLane(order: readonly string[], from: number, to: number): string[] {
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The height of the list of `count` rows. */
export function listHeight(count: number): number {
  return count === 0 ? 0 : count * PITCH - LANE_ORDER_ROW.gap;
}
