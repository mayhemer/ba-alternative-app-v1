import { fitFontSize } from './textFit';

// ── Fitting a label's font size ───────────────────────────────────────────────
//
// The glyph width ratio is empirical and differs per platform
// (ui/charWidthRatio); fixed here at 0.75, so a character is 9 px at a font
// size of 12. Not 1: the cases at the limit would then pass even if the ratio
// were ignored. The shrunk size is TEXT_SHRINK_SCALE (0.8) of the base.
//
// Dimensions: the estimate against the room (under, exactly at, just over, far
// over); one line or several.

jest.mock('./charWidthRatio', () => ({ CHAR_WIDTH_RATIO: 0.75 }));

describe('fitFontSize', () => {
  it('keeps the base size while the label fits', () => {
    // 9 × 9 = 81 of 90.
    expect(fitFontSize(9, 90, 1, 12)).toBe(12);
  });

  it('keeps the base size when the label fills the room exactly', () => {
    // 10 × 9 = 90 of 90 (10 × 12 = 120 without the ratio).
    expect(fitFontSize(10, 90, 1, 12)).toBe(12);
  });

  it('shrinks a label just too long for the room', () => {
    // 11 × 9 = 99 of 90.
    expect(fitFontSize(11, 90, 1, 12)).toBeCloseTo(9.6);
  });

  it('shrinks only once, however long the label', () => {
    expect(fitFontSize(1000, 90, 1, 12)).toBeCloseTo(9.6);
  });

  it('spreads the label over its lines', () => {
    // 20 × 9 / 2 = 90 of 90; 21 × 9 / 2 = 94.5.
    expect(fitFontSize(20, 90, 2, 12)).toBe(12);
    expect(fitFontSize(21, 90, 2, 12)).toBeCloseTo(9.6);
  });
});
