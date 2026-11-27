import { overlayPanelColumn } from './overlayPanelColumn';

// ── The column the overlay panels and their search field take ─────────────────
//
// Dimension: the screen — a phone upright, a phone turned (landscape: not wide
// and wider than tall), a square phone screen, a wide screen held either way.
// The column is placed in the panel's own area (the content area, inside the
// safe area), so a turned phone's is in percent of it.

describe('overlayPanelColumn', () => {
  it('spans an upright phone, inset from both edges', () => {
    expect(overlayPanelColumn({ isWide: false, width: 402, height: 874 }))
      .toEqual({ left: 10, right: 10, width: undefined });
  });

  it('takes the middle 70% of a turned phone, centred', () => {
    expect(overlayPanelColumn({ isWide: false, width: 874, height: 402 }))
      .toEqual({ left: '15%', right: '15%', width: undefined });
  });

  it('spans a square phone screen, which is not turned', () => {
    expect(overlayPanelColumn({ isWide: false, width: 500, height: 500 }))
      .toEqual({ left: 10, right: 10, width: undefined });
  });

  it.each([
    ['held sideways', 1194, 834],
    ['held upright', 834, 1194],
  ])('stops at 780 pt on a wide screen %s, pinned right', (_, width, height) => {
    expect(overlayPanelColumn({ isWide: true, width, height }))
      .toEqual({ left: undefined, right: 10, width: 780 });
  });
});
