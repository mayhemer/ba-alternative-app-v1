import { BREAK_WINDOW_OFFSET_MS } from '../../lib/plan';
import { itemOffsets, maxScrollOffset, PLAN_LAYOUT, type PlanItem } from './planUtils';

// ── My plan's time curve: list position ↔ time ────────────────────────────────
//
// Turning the phone keeps the time the screen shows (landscape/PlanTimeline
// shows it at its centre line). On the list, a curve maps a height in the
// list's content to a time, and back:
//
//   - each element with a time gives a point at its centre: a set row its
//     start (rows starting together merged into one element, from the first
//     one's top to the last one's bottom), a break the time it starts (the
//     opening break 08:00, any other the end of everything listed above it, as
//     buildPlanDay starts it), the end cap the end of everything listed;
//   - the start cap, spacers, spacing and padding give none: height only;
//   - neighbouring points are joined by straight lines, and the curve is held
//     at its first point above it and at its last below it.
//
// Both height and time rise strictly from point to point, so the curve can be
// read either way, at any height or time, not only at its points. The list's
// time is the curve at its middle line: the middle of what is visible above
// the floating bottom bar, or half the list's height when it is shorter.

export type CurvePoint = { y: number; timeMs: number };

/** The curve's points, top to bottom; none on a day with no set listed. */
export function planTimeCurve(items: PlanItem[], dayStart: number): CurvePoint[] {
  const offsets = itemOffsets(items);
  const points: CurvePoint[] = [];
  // The end of everything listed so far: where a break starts.
  let listedEnd: number | null = null;
  // The rows starting together, still open for one more.
  let group: { top: number; bottom: number; timeMs: number } | null = null;

  const add = (y: number, timeMs: number): void => {
    // Held strictly rising: a point no later than the one above adds nothing.
    const last = points.at(-1);
    if (last === undefined || timeMs > last.timeMs) {
      points.push({ y, timeMs });
    }
  };
  const closeGroup = (): void => {
    if (group !== null) {
      add((group.top + group.bottom) / 2, group.timeMs);
      group = null;
    }
  };

  items.forEach((item, i) => {
    const top = offsets[i];
    const bottom = top + item.height;
    switch (item.kind) {
      case 'set': {
        const start = item.event.dateFrom;
        if (group !== null && group.timeMs === start) {
          group.bottom = bottom;
        } else {
          closeGroup();
          group = { top, bottom, timeMs: start };
        }
        listedEnd = listedEnd === null ? item.event.dateTo : Math.max(listedEnd, item.event.dateTo);
        break;
      }
      case 'gap': {
        closeGroup();
        const start = item.opening ? dayStart + BREAK_WINDOW_OFFSET_MS : listedEnd;
        if (start !== null) {
          add((top + bottom) / 2, start);
        }
        break;
      }
      case 'cap': {
        closeGroup();
        if (item.edge === 'end' && listedEnd !== null) {
          add((top + bottom) / 2, listedEnd);
        }
        break;
      }
      case 'spacer':
      case 'empty':
        break;
    }
  });
  closeGroup();
  return points;
}

/** The time at height `y`; held at the first and last point; null without points. */
export function curveTimeAt(points: CurvePoint[], y: number): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  if (y <= first.y) {
    return first.timeMs;
  }
  if (y >= last.y) {
    return last.timeMs;
  }
  const i = points.findIndex((p) => p.y > y);
  const a = points[i - 1];
  const b = points[i];
  return a.timeMs + ((y - a.y) / (b.y - a.y)) * (b.timeMs - a.timeMs);
}

/** The height of time `timeMs`; held at the first and last point; null without points. */
export function curveYAt(points: CurvePoint[], timeMs: number): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  if (timeMs <= first.timeMs) {
    return first.y;
  }
  if (timeMs >= last.timeMs) {
    return last.y;
  }
  const i = points.findIndex((p) => p.timeMs > timeMs);
  const a = points[i - 1];
  const b = points[i];
  return a.y + ((timeMs - a.timeMs) / (b.timeMs - a.timeMs)) * (b.y - a.y);
}

type ListView = { viewportHeight: number; bottomInset: number };

/** The list's content height: its items, padding and spacing, without the bottom bar's clearance. */
function contentHeight(items: PlanItem[]): number {
  return items.reduce<number>((y, item) => y + item.height + PLAN_LAYOUT.itemSpacing, PLAN_LAYOUT.paddingTop) + PLAN_LAYOUT.paddingBottom;
}

/** The list's time, scrolled to `scrollY`: the curve at its middle line. Null when it lists no set. */
export function planListTime(items: PlanItem[], dayStart: number, { scrollY, viewportHeight, bottomInset }: ListView & { scrollY: number }): number | null {
  const visible = viewportHeight - bottomInset;
  const height = contentHeight(items);
  const middle = height < visible ? height / 2 : scrollY + visible / 2;
  return curveTimeAt(planTimeCurve(items, dayStart), middle);
}

/**
 * Where the list scrolls to show `timeMs`: its height on the curve on the
 * middle line, held within what the list can scroll. Null when it lists no set.
 */
export function planListOffsetAt(items: PlanItem[], dayStart: number, timeMs: number, { viewportHeight, bottomInset }: ListView): number | null {
  const y = curveYAt(planTimeCurve(items, dayStart), timeMs);
  if (y === null) {
    return null;
  }
  const visible = viewportHeight - bottomInset;
  return Math.max(0, Math.min(y - visible / 2, maxScrollOffset(items, viewportHeight, bottomInset)));
}
