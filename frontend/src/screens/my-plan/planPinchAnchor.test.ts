import { pinchAnchor, pinchScrollOffset, type PinchAnchor } from './planPinchAnchor';
import type { PlanItem } from './planUtils';

// ── Where the list stays put through a pinch ──────────────────────────────────
//
// A pinch that changes the filter keeps the set row under the pinch's centre
// where it was on screen (its centre at the same height), or, if the new filter
// drops it, the nearest listed sets above and below it, centred together where
// it was. Dimensions:
//   where the pinch is — on a set row, on a gap, below the last row, on a day
//                        with no set listed;
//   the anchor row     — still listed (taller now), dropped with sets on both
//                        sides, with sets only below, only above, none left;
//   the scroll range   — the target held at the top and at the end, the floating
//                        bar's clearance added to the end.
//
// The list's layout: 12 pt top padding, items 6 pt apart (PLAN_LAYOUT), 24 pt
// bottom padding. Only an item's kind, key and height matter here.

function set(key: string, height: number): PlanItem {
  return { kind: 'set', key, height } as unknown as PlanItem;
}

function gap(key: string, height: number): PlanItem {
  return { kind: 'gap', key, height } as unknown as PlanItem;
}

// a 12–72, gap 78–118, b 124–184, c 190–250, gap 256–296, d 302–362.
const BEFORE = [set('a', 60), gap('g1', 40), set('b', 60), set('c', 60), gap('g2', 40), set('d', 60)];
const ORDER = ['a', 'b', 'c', 'd'];

describe('pinchAnchor', () => {
  it('takes the set row under the pinch, with its centre on screen', () => {
    // Scrolled to 100, the pinch at 50 on screen: content 150, inside b (centre 154).
    expect(pinchAnchor(BEFORE, 100, 50)).toEqual({ eventId: 'b', centre: 54, order: ORDER });
  });

  it('takes the nearest set row when the pinch is on a gap', () => {
    // Content 100, on the gap: a ends 28 above, b starts 24 below.
    expect(pinchAnchor(BEFORE, 0, 100)).toEqual({ eventId: 'b', centre: 154, order: ORDER });
  });

  it('takes the last set row when the pinch is below it', () => {
    // Content 400, below d (centre 332).
    expect(pinchAnchor(BEFORE, 200, 200)).toEqual({ eventId: 'd', centre: 132, order: ORDER });
  });

  it('has none on a day with no set listed', () => {
    expect(pinchAnchor([gap('g', 100)], 0, 50)).toBeNull();
  });
});

describe('pinchScrollOffset', () => {
  const anchor = (eventId: string, centre: number): PinchAnchor => ({ eventId, centre, order: ORDER });

  it("keeps a row still listed with its centre where it was, though it's taller now", () => {
    // a 12–72, b 78–158 (centre 118), c 164–224, d 230–290; end 296 + 24.
    const after = [set('a', 60), set('b', 80), set('c', 60), set('d', 60)];
    expect(pinchScrollOffset(anchor('b', 54), after, 100, 0)).toBe(64);
  });

  it('centres the nearest listed sets above and below where a dropped row was', () => {
    // b and c dropped: a 12–72, gap 78–118, d 124–184; a to d centred at 98.
    const after = [set('a', 60), gap('g', 40), set('d', 60)];
    expect(pinchScrollOffset(anchor('b', 54), after, 100, 0)).toBe(44);
  });

  it('centres the nearest set below when none is listed above', () => {
    // a dropped: b 12–72 (centre 42), c 78–138.
    const after = [set('b', 60), set('c', 60)];
    expect(pinchScrollOffset(anchor('a', 20), after, 100, 0)).toBe(22);
  });

  it('centres the nearest set above when none is listed below', () => {
    // d dropped: a 12–72, b 78–138 (centre 108).
    const after = [set('a', 60), set('b', 60)];
    expect(pinchScrollOffset(anchor('d', 50), after, 100, 0)).toBe(58);
  });

  it('has no target when no set is listed any more', () => {
    expect(pinchScrollOffset(anchor('b', 54), [gap('g', 100)], 100, 0)).toBeNull();
  });

  it('holds the target at the top', () => {
    // b's centre at 118 cannot come down to 300.
    const after = [set('a', 60), set('b', 80), set('c', 60), set('d', 60)];
    expect(pinchScrollOffset(anchor('b', 300), after, 100, 0)).toBe(0);
  });

  it("holds the target at the list's end, the floating bar's clearance below it", () => {
    // d's centre at 260 would need 360; the list scrolls 296 + 24 − 100 = 220,
    // or 270 with a 50 pt clearance.
    const after = [set('a', 60), set('b', 80), set('c', 60), set('d', 60)];
    expect(pinchScrollOffset(anchor('d', -100), after, 100, 0)).toBe(220);
    expect(pinchScrollOffset(anchor('d', -100), after, 100, 50)).toBe(270);
  });
});
