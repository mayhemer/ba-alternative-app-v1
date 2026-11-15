import { leftEdgeDots } from './LeftEdge.model';

// ── A Maybe row's dotted left edge: where its dots go ─────────────────────────
//
// 3 pt square dots, 3 pt apart, as many as fit with 2 pt kept clear at each end
// (clear of the row's rounded corners), centred and on whole points, so both
// ends are whole dots on every row height. The dimensions: the compact row
// (26 pt), the tall row (58 pt), and the boundaries: room for exactly one dot,
// and for none.

describe('leftEdgeDots', () => {
  it('puts four dots on the compact row, centred', () => {
    // 4 dots span 21 pt: (26 − 21) / 2 = 2.5, down to 2.
    expect(leftEdgeDots(26)).toEqual([2, 8, 14, 20]);
  });

  it('puts nine dots on the tall row, centred', () => {
    // 9 dots span 51 pt: (58 − 51) / 2 = 3.5, down to 3.
    expect(leftEdgeDots(58)).toEqual([3, 9, 15, 21, 27, 33, 39, 45, 51]);
  });

  it('puts one dot where only one fits clear of both ends', () => {
    expect(leftEdgeDots(7)).toEqual([2]);
  });

  it('puts none where not even one fits', () => {
    expect(leftEdgeDots(6)).toEqual([]);
  });
});
