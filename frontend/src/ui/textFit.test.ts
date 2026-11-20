import { fitText } from './textFit';

// ── Fitting a label's font size and lines ─────────────────────────────────────
//
// The glyph width ratio is empirical and differs per platform
// (ui/charWidthRatio); fixed here at 0.75, so a character (a space included) is
// 9 px at a font size of 12 and 7.2 px at the shrunk 9.6. Not 1: the cases at
// the limit would then pass even if the ratio were ignored. The shrunk size is
// TEXT_SHRINK_SCALE (0.8) of the base.
//
// Dimensions: the estimate against the room (under, exactly at, just over, far
// over); one line or several; the words wrapped at their boundaries (a line
// holding several words, the longest word against the room, more lines needed
// than allowed).

jest.mock('./charWidthRatio', () => ({ CHAR_WIDTH_RATIO: 0.75 }));

describe('fitText on one line', () => {
  it('keeps the base size while the label fits', () => {
    // 9 × 9 = 81 of 90.
    expect(fitText('A'.repeat(9), 90, 1, 12)).toEqual({ fontSize: 12, lines: 1 });
  });

  it('keeps the base size when the label fills the room exactly', () => {
    // 10 × 9 = 90 of 90 (10 × 12 = 120 without the ratio).
    expect(fitText('A'.repeat(10), 90, 1, 12)).toEqual({ fontSize: 12, lines: 1 });
  });

  it('shrinks a label just too long for the room', () => {
    // 11 × 9 = 99 of 90; 11 × 7.2 = 79.2 shrunk.
    const fit = fitText('A'.repeat(11), 90, 1, 12);
    expect(fit.fontSize).toBeCloseTo(9.6);
    expect(fit.lines).toBe(1);
  });

  it('shrinks only once, however long the label: the rest ellipsizes', () => {
    const fit = fitText('A'.repeat(1000), 90, 1, 12);
    expect(fit.fontSize).toBeCloseTo(9.6);
    expect(fit.lines).toBe(1);
  });
});

describe('fitText over several lines, wrapping at word boundaries', () => {
  it('keeps the base size when each word gets a line of its own', () => {
    // NOVEMBERS 9 × 9 = 81 of 90, DOOM 36; together 14 × 9 = 126.
    expect(fitText('NOVEMBERS DOOM', 90, 2, 12)).toEqual({ fontSize: 12, lines: 2 });
  });

  it('puts several words on a line while they fit, the space counted', () => {
    // "AA BB" 5 × 9 = 45 of 45, then "CC": two lines at 12. One word a line
    // would need three and shrink.
    expect(fitText('AA BB CC', 45, 2, 12)).toEqual({ fontSize: 12, lines: 2 });
  });

  it('shrinks when the longest word does not fit a line, though the label spread evenly would', () => {
    // NOVEMBERS 81 of 80 at 12 (the whole name over two lines: 126 / 2 = 63);
    // 9 × 7.2 = 64.8 shrunk.
    const fit = fitText('NOVEMBERS DOOM', 80, 2, 12);
    expect(fit.fontSize).toBeCloseTo(9.6);
    expect(fit.lines).toBe(2);
  });

  it('keeps to one line when the longest word does not fit even shrunk, rather than break it', () => {
    // NOVEMBERS 64.8 of 64 shrunk.
    const fit = fitText('NOVEMBERS DOOM', 64, 2, 12);
    expect(fit.fontSize).toBeCloseTo(9.6);
    expect(fit.lines).toBe(1);
  });

  it('shrinks when the words need more lines than allowed, and keeps all the lines, the last ellipsized', () => {
    // Each word 4 × 9 = 36 of 40, but two together 9 × 9 = 81: three lines at
    // 12, still three shrunk (9 × 7.2 = 64.8).
    const fit = fitText('AAAA BBBB CCCC', 40, 2, 12);
    expect(fit.fontSize).toBeCloseTo(9.6);
    expect(fit.lines).toBe(2);
  });
});
