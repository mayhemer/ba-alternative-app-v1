import { curveTimeAt, curveYAt, planListOffsetAt, planListTime, planTimeCurve } from './planTimeCurve';
import type { PlanItem } from './planUtils';

// ── My plan's time curve: list position ↔ time ────────────────────────────────
//
// Turning the phone keeps the time the screen shows. On the list, a curve maps
// a height in the list's content to a time: each element with a time gives a
// point at its centre (a set row its start, rows starting together merged into
// one, a break the time it starts, the end cap the end of everything listed),
// neighbouring points are joined by straight lines, and the curve is held at
// its first and last point beyond them. The list's time is the curve at its
// middle line. Dimensions:
//   the elements   — set rows, rows starting together, a break, the opening
//                    break, the start cap, a spacer, the end cap, no set at all;
//   where it is read — on a point, between two points, across a break, above
//                    the first point, below the last;
//   the list       — longer than the screen, shorter (its middle is then half
//                    its height), the bottom bar's clearance;
//   a landing      — free, held at the top, held at the end.
//
// The list's layout: 12 pt top padding, items 6 pt apart (PLAN_LAYOUT), 24 pt
// bottom padding.

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
/** Wednesday's festival day, from 06:00. */
const DAY = Date.parse('2025-08-06T06:00:00+02:00');
/** A time of Wednesday's festival day: hours before 06:00 are after midnight. */
const at = (hms: string): number => {
  const [h, m, s = 0] = hms.split(':').map(Number);
  return DAY + ((h < 6 ? h + 24 : h) - 6) * HOUR + m * MINUTE + s * 1000;
};

function set(key: string, from: string, to: string, height = 60): PlanItem {
  return { kind: 'set', key, height, event: { dateFrom: at(from), dateTo: at(to) } } as unknown as PlanItem;
}
function gap(key: string, height: number, opening = false): PlanItem {
  return { kind: 'gap', key, height, opening } as unknown as PlanItem;
}
function cap(edge: 'start' | 'end'): PlanItem {
  return { kind: 'cap', key: `cap-${edge}`, edge, height: 20 } as unknown as PlanItem;
}
function spacer(key: string): PlanItem {
  return { kind: 'spacer', key, height: 24 } as unknown as PlanItem;
}

// start cap 12–32
// a 14:00–14:40   38–98    centre 68   → 14:00
// b 14:30–15:05  104–164   centre 134  → 14:30
// break          170–210   centre 190  → 15:05, the end of a and b
// c 23:30–00:30  216–276   centre 246  → 23:30
// spacer         282–306
// d 00:30–01:15  312–372 ┐ merged: 312–438, centre 375 → 00:30
// e 00:30–01:30  378–438 ┘
// f 00:45–01:30  444–504   centre 474  → 00:45
// end cap        510–530   centre 520  → 01:30, the end of everything
// Content: 530 + 6 spacing + 24 padding = 560.
const DAY_ITEMS = [
  cap('start'),
  set('a', '14:00', '14:40'),
  set('b', '14:30', '15:05'),
  gap('g', 40),
  set('c', '23:30', '00:30'),
  spacer('s'),
  set('d', '00:30', '01:15'),
  set('e', '00:30', '01:30'),
  set('f', '00:45', '01:30'),
  cap('end'),
];
const CURVE = [
  { y: 68, timeMs: at('14:00') },
  { y: 134, timeMs: at('14:30') },
  { y: 190, timeMs: at('15:05') },
  { y: 246, timeMs: at('23:30') },
  { y: 375, timeMs: at('00:30') },
  { y: 474, timeMs: at('00:45') },
  { y: 520, timeMs: at('01:30') },
];

describe('planTimeCurve', () => {
  it("puts a point at each row's, break's and end cap's centre, none for the start cap or a spacer, rows starting together as one", () => {
    expect(planTimeCurve(DAY_ITEMS, DAY)).toEqual(CURVE);
  });

  it('starts the opening break at 08:00', () => {
    // opening break 12–62 (centre 37), a 68–128 (centre 98).
    const items = [gap('open', 50, true), set('a', '14:00', '14:40')];
    expect(planTimeCurve(items, DAY)).toEqual([
      { y: 37, timeMs: at('08:00') },
      { y: 98, timeMs: at('14:00') },
    ]);
  });

  it('has no point on a day with no set listed', () => {
    expect(planTimeCurve([gap('g', 100)], DAY)).toEqual([]);
  });
});

describe('curveTimeAt', () => {
  it("reads a point's time on it", () => {
    expect(curveTimeAt(CURVE, 68)).toBe(at('14:00'));
  });

  it('reads along the straight line between two points', () => {
    // Halfway from 68 (14:00) to 134 (14:30).
    expect(curveTimeAt(CURVE, 101)).toBe(at('14:15'));
  });

  it('reads along a break as along any other line', () => {
    // Halfway from 190 (15:05) to 246 (23:30): 15:05 + 8 h 25 / 2.
    expect(curveTimeAt(CURVE, 218)).toBe(at('19:17:30'));
  });

  it('holds the first point above it and the last below it', () => {
    expect(curveTimeAt(CURVE, 20)).toBe(at('14:00'));
    expect(curveTimeAt(CURVE, 545)).toBe(at('01:30'));
  });

  it('has none without points', () => {
    expect(curveTimeAt([], 100)).toBeNull();
  });
});

describe('curveYAt', () => {
  it('finds the height along the line between two points', () => {
    expect(curveYAt(CURVE, at('14:15'))).toBe(101);
    expect(curveYAt(CURVE, at('19:17:30'))).toBe(218);
  });

  it('finds the merged rows\' centre for their shared start', () => {
    expect(curveYAt(CURVE, at('00:30'))).toBe(375);
  });

  it('holds the first point before it and the last after it', () => {
    expect(curveYAt(CURVE, at('10:00'))).toBe(68);
    expect(curveYAt(CURVE, at('03:00'))).toBe(520);
  });

  it('has none without points', () => {
    expect(curveYAt([], at('14:00'))).toBeNull();
  });
});

describe('planListTime', () => {
  it("reads the curve at the list's middle line", () => {
    // 1 + 200 / 2 = 101.
    expect(planListTime(DAY_ITEMS, DAY, { scrollY: 1, viewportHeight: 200, bottomInset: 0 })).toBe(at('14:15'));
  });

  it("takes the bottom bar's clearance off the visible height", () => {
    // Visible 300 − 100 = 200: middle 101. On the whole 300 it would be 151.
    expect(planListTime(DAY_ITEMS, DAY, { scrollY: 1, viewportHeight: 300, bottomInset: 100 })).toBe(at('14:15'));
  });

  it("reads half the list's height when the list is shorter than the screen", () => {
    // a 12–72 (centre 42, 14:00), b 78–126 (centre 102, 14:30); content 126 + 30 = 156.
    // Middle 78: 36 of 60 pt from a to b, 14:00 + 0.6 × 30 min. Half the screen
    // (500) would read b's 14:30.
    const items = [set('a', '14:00', '14:40'), set('b', '14:30', '15:05', 48)];
    expect(planListTime(items, DAY, { scrollY: 0, viewportHeight: 1000, bottomInset: 0 })).toBe(at('14:18'));
  });

  it('has none on a day with no set listed', () => {
    expect(planListTime([gap('g', 100)], DAY, { scrollY: 0, viewportHeight: 200, bottomInset: 0 })).toBeNull();
  });
});

describe('planListOffsetAt', () => {
  it("scrolls the time's height to the middle line", () => {
    // 101 − 100.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('14:15'), { viewportHeight: 200, bottomInset: 0 })).toBe(1);
    // 218 − 100.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('19:17:30'), { viewportHeight: 200, bottomInset: 0 })).toBe(118);
  });

  it('centres within the visible height above the bottom bar', () => {
    // 101 − 200 / 2; on the whole 300 it would be held at 0.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('14:15'), { viewportHeight: 300, bottomInset: 100 })).toBe(1);
  });

  it('holds the landing at the top', () => {
    // 68 − 100.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('14:00'), { viewportHeight: 200, bottomInset: 0 })).toBe(0);
  });

  it("holds the landing at the end, the bottom bar's clearance added below the content", () => {
    // 520 − 100 = 420, held at 560 − 200 = 360.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('01:30'), { viewportHeight: 200, bottomInset: 0 })).toBe(360);
    // 520 − 75 = 445, held at 560 + 50 − 200 = 410.
    expect(planListOffsetAt(DAY_ITEMS, DAY, at('01:30'), { viewportHeight: 200, bottomInset: 50 })).toBe(410);
  });

  it('has none on a day with no set listed', () => {
    expect(planListOffsetAt([gap('g', 100)], DAY, at('14:00'), { viewportHeight: 200, bottomInset: 0 })).toBeNull();
  });
});

describe('round trips', () => {
  it('lands on a time and reads the same time back', () => {
    const offset = planListOffsetAt(DAY_ITEMS, DAY, at('19:17:30'), { viewportHeight: 200, bottomInset: 0 });
    expect(offset).toBe(118);
    expect(planListTime(DAY_ITEMS, DAY, { scrollY: 118, viewportHeight: 200, bottomInset: 0 })).toBe(at('19:17:30'));
  });

  it('reads a time at any scroll and lands back on the same scroll', () => {
    // Middle 137: 3 of 56 pt from b (14:30) to the break (15:05), 14:30 + 3/56 × 35 min.
    const time = planListTime(DAY_ITEMS, DAY, { scrollY: 37, viewportHeight: 200, bottomInset: 0 });
    expect(time).toBe(at('14:31:52.5'));
    expect(planListOffsetAt(DAY_ITEMS, DAY, time!, { viewportHeight: 200, bottomInset: 0 })).toBeCloseTo(37, 6);
  });
});
