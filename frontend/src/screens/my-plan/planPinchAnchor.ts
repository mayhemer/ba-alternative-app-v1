import { itemOffsets, maxScrollOffset, type PlanItem } from './planUtils';

// ── A pinch keeps its place on the list ───────────────────────────────────────
//
// A pinch that changes My plan's filter keeps the set row under its centre
// where it was on screen: that row's centre stays at the same height. If the
// stricter filter drops the row, the nearest listed set above it and the
// nearest below are centred together where it was (one alone when the other
// side has none). Rows only: a gap or cap is rebuilt by every filter, so a pinch
// on one holds the nearest set row. Spec: docs/frontend/design/my-plan.md › Pinch.

export type PinchAnchor = {
  /** The set row held: its event's id, the row's key. */
  eventId: string;
  /** Where its centre was, from the list's top edge on screen. */
  centre: number;
  /** The set rows listed before the pinch, top to bottom: which sets were above and below it. */
  order: string[];
};

/**
 * The set row a pinch at `focalY` (from the list's top edge) holds, the list
 * scrolled to `scrollY`: the one under it, else the nearest. Null on a day
 * with no set listed.
 */
export function pinchAnchor(items: PlanItem[], scrollY: number, focalY: number): PinchAnchor | null {
  const offsets = itemOffsets(items);
  const y = scrollY + focalY;
  let held = -1;
  let heldDistance = Infinity;
  for (let index = 0; index < items.length; index++) {
    if (items[index].kind !== 'set') {
      continue;
    }
    const top = offsets[index];
    const bottom = top + items[index].height;
    const distance = Math.max(top - y, y - bottom, 0);
    if (distance < heldDistance) {
      held = index;
      heldDistance = distance;
    }
  }
  if (held === -1) {
    return null;
  }
  return {
    eventId: items[held].key,
    centre: offsets[held] + items[held].height / 2 - scrollY,
    order: items.filter((item) => item.kind === 'set').map((item) => item.key),
  };
}

/**
 * Where the list after the pinch is scrolled so the anchor keeps its place,
 * held within what it can scroll; null when it lists no set the anchor knows.
 */
export function pinchScrollOffset(
  anchor: PinchAnchor,
  items: PlanItem[],
  viewportHeight: number,
  bottomInset: number,
): number | null {
  const offsets = itemOffsets(items);
  let first = items.findIndex((item) => item.kind === 'set' && item.key === anchor.eventId);
  let last = first;
  if (first === -1) {
    // The nearest listed sets above and below it, by the order before the pinch.
    const at = anchor.order.indexOf(anchor.eventId);
    let above = -1;
    let below = -1;
    for (let index = 0; index < items.length; index++) {
      const was = items[index].kind === 'set' ? anchor.order.indexOf(items[index].key) : -1;
      if (was === -1) {
        continue;
      }
      if (was < at) {
        above = index;
      } else if (below === -1) {
        below = index;
      }
    }
    first = above !== -1 ? above : below;
    last = below !== -1 ? below : above;
    if (first === -1) {
      return null;
    }
  }
  const middle = (offsets[first] + offsets[last] + items[last].height) / 2;
  const max = maxScrollOffset(items, viewportHeight, bottomInset);
  return Math.min(Math.max(middle - anchor.centre, 0), max);
}
