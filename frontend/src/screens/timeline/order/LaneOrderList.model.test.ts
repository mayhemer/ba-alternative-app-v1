import { dropIndex, listHeight, moveLane, slotTop } from './LaneOrderList.model';

// ── Dragging a row of the order list ──────────────────────────────────────────
//
// A row is 48 tall with 6 between rows: one row down is 54.
//
// Dimensions, and the corner cases tested for each:
//   distance  — under half a row (stays), exactly half (moves down, not up),
//               past the ends of the list (stops at the first or last place)
//   the rows  — above, between and below the drag's start and its target;
//               no drag at all

describe('dropIndex', () => {
  it('stays in place under half a row down', () => {
    expect(dropIndex(0, 26, 5)).toBe(0);
  });

  it('moves one place down from half a row', () => {
    expect(dropIndex(0, 27, 5)).toBe(1);
  });

  it('stays in place at exactly half a row up', () => {
    expect(dropIndex(2, -27, 5)).toBe(2);
  });

  it('moves one place up past half a row', () => {
    expect(dropIndex(2, -28, 5)).toBe(1);
  });

  it('moves several places', () => {
    expect(dropIndex(1, 3 * 54, 5)).toBe(4);
  });

  it('stops at the last place', () => {
    expect(dropIndex(3, 10 * 54, 5)).toBe(4);
  });

  it('stops at the first place', () => {
    expect(dropIndex(1, -10 * 54, 5)).toBe(0);
  });
});

describe('slotTop', () => {
  it('is the row\'s own place with no drag', () => {
    expect(slotTop(3, null)).toBe(162);
  });

  it('moves the rows between a drag\'s start and a lower target up by one', () => {
    const drag = { from: 1, target: 3 };
    expect([slotTop(0, drag), slotTop(2, drag), slotTop(3, drag), slotTop(4, drag)]).toEqual([0, 54, 108, 216]);
  });

  it('moves the rows between a higher target and the drag\'s start down by one', () => {
    const drag = { from: 3, target: 1 };
    expect([slotTop(0, drag), slotTop(1, drag), slotTop(2, drag), slotTop(4, drag)]).toEqual([0, 108, 162, 216]);
  });
});

describe('moveLane', () => {
  it('moves a lane down', () => {
    expect(moveLane(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a lane up', () => {
    expect(moveLane(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the order as it was for a drop in place', () => {
    expect(moveLane(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('listHeight', () => {
  it('is the rows and the gaps between them', () => {
    expect(listHeight(5)).toBe(5 * 48 + 4 * 6);
  });

  it('is zero with no rows', () => {
    expect(listHeight(0)).toBe(0);
  });
});
