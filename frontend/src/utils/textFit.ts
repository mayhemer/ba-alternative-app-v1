import { TEXT_SHRINK_SCALE } from '../styling/tokens';

// Font-size fitting for single- and few-line labels in a known-width box.
//
// Used instead of React Native's `adjustsFontSizeToFit` + `minimumFontScale`,
// which cannot hold a lower bound under the New Architecture. Fabric's text
// layout on both platforms — RCTTextLayoutManager on iOS, TextLayoutManager on
// Android — reads only `minimumFontSize`, which React Native does not expose as
// a JS prop (it is absent from TextNativeComponent's `validAttributes`, so it is
// dropped before reaching native). With no value supplied both fall back to a
// hard 4 pt floor, shrinking long labels to unreadable. `minimumFontScale` is
// still parsed into ParagraphAttributes but never read; only the old
// architecture derived the floor from it.

// Mean glyph advance as a fraction of font size, for Work Sans Bold. Only an
// estimate — a label of unusually wide glyphs may ellipsize rather than shrink.
const CHAR_WIDTH_RATIO = 0.55;

/**
 * `baseFontSize`, or `TEXT_SHRINK_SCALE` of it when the label is estimated not
 * to fit `availableWidth` across `lines` lines. There is no third step: below
 * the shrunk size the label ellipsizes rather than becoming unreadable.
 *
 * The estimate spreads the label evenly over the available lines, so it is
 * optimistic for multi-line labels, which wrap at word boundaries. Erring that
 * way degrades to "truncated but readable" rather than "fits but illegible".
 */
export function fitFontSize(
  charCount: number,
  availableWidth: number,
  lines: number,
  baseFontSize: number,
): number {
  const estimatedWidth = charCount * baseFontSize * CHAR_WIDTH_RATIO;
  if (estimatedWidth / lines > availableWidth) {
    return baseFontSize * TEXT_SHRINK_SCALE;
  }
  return baseFontSize;
}
