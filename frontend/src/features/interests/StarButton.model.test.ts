import { getFeedbackLabel, STAR_COLUMN_RESERVE, starGlyphModel } from './StarButton.model';
import { colors } from '../../styling/tokens';

// ── The interest star, as a model ─────────────────────────────────────────────
//
// Dimensions: each status; the two sizes the app draws (26 in rows, 32 in the
// sheet); a colour override (the toast's strip).

describe('starGlyphModel', () => {
  it('draws each status with its icon and colour', () => {
    expect(starGlyphModel('none', 26)).toEqual({ icon: 'star-outline', color: colors.notInterested, size: 26, strike: null });
    expect(starGlyphModel('maybe', 26)).toEqual({ icon: 'star-half', color: colors.accent, size: 26, strike: null });
    expect(starGlyphModel('will_go', 26)).toEqual({ icon: 'star', color: colors.accent, size: 26, strike: null });
  });

  it("strikes a don't-go star through, sized from the star", () => {
    // 26: a bar 29 long (26 × 1.1), 2 thick (26 × 0.08, at least 2), centred on the square.
    expect(starGlyphModel('dont_go', 26)).toEqual({
      icon: 'star-outline', color: colors.dontGo, size: 26, strike: { left: -1.5, top: 12, length: 29, thickness: 2 },
    });
    // 32: 35 long, 3 thick.
    expect(starGlyphModel('dont_go', 32).strike).toEqual({ left: -1.5, top: 14.5, length: 35, thickness: 3 });
  });

  // Icons need about 3:1 against what is behind them (WCAG 1.4.11). The star is
  // drawn on the list's background and on the star selector's surface.
  it.each([
    ['the list', colors.background],
    ['the star selector', colors.toastSurface],
  ])("draws a don't-go star that reads on %s", (_, behind: string) => {
    expect(contrast(starGlyphModel('dont_go', 26).color, behind)).toBeGreaterThanOrEqual(3);
  });

  it('takes another colour for the shape only', () => {
    expect(starGlyphModel('dont_go', 18, colors.white)).toMatchObject({ icon: 'star-outline', color: colors.white });
  });
});

describe('the star\'s labels and reach', () => {
  it('names each status', () => {
    expect(['none', 'maybe', 'will_go', 'dont_go'].map((s) => getFeedbackLabel(s as 'none'))).toEqual(['Not marked', 'Maybe', 'Must see!', "Don't go"]);
  });

  it('keeps overlays 83 pt from the column\'s edge: the sheet star with its slop and the web ✕', () => {
    expect(STAR_COLUMN_RESERVE).toBe(83);
  });
});

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
