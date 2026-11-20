import { TEXT_SHRINK_SCALE } from '../styling/tokens';
import { CHAR_WIDTH_RATIO } from './charWidthRatio';

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

// The estimate's glyph width per platform: ui/charWidthRatio.

export type TextFit = {
  fontSize: number;
  /** For `numberOfLines`: the lines allowed, or 1 where a word would otherwise be broken. */
  lines: number;
};

/**
 * Whether `words`, wrapped at their boundaries, are estimated to fill no more
 * than `maxLines` lines of `availableWidth` at `fontSize`, no word wider than
 * a line. Lines are filled greedily, as the text engine fills them; a space
 * counts as a character.
 */
function wrapsWithin(words: string[], availableWidth: number, maxLines: number, fontSize: number): boolean {
  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  let lines = 1;
  let lineChars = 0;
  for (const word of words) {
    if (word.length * charWidth > availableWidth) {
      return false;
    }
    const joined = lineChars === 0 ? word.length : lineChars + 1 + word.length;
    if (joined * charWidth <= availableWidth) {
      lineChars = joined;
    } else {
      lines += 1;
      lineChars = word.length;
    }
  }
  return lines <= maxLines;
}

/**
 * `baseFontSize` on up to `maxLines` lines when `text` is estimated to fit
 * `availableWidth` there, wrapped at word boundaries; otherwise
 * `TEXT_SHRINK_SCALE` of it. There is no third step: below the shrunk size the
 * label ellipsizes rather than becoming unreadable. When a word does not fit
 * a line even shrunk, the text engine would break it mid-word, so the label
 * keeps to one line and ellipsizes there instead.
 */
export function fitText(text: string, availableWidth: number, maxLines: number, baseFontSize: number): TextFit {
  const words = text.split(' ').filter((word) => word !== '');
  if (wrapsWithin(words, availableWidth, maxLines, baseFontSize)) {
    return { fontSize: baseFontSize, lines: maxLines };
  }
  const shrunk = baseFontSize * TEXT_SHRINK_SCALE;
  const longest = Math.max(0, ...words.map((word) => word.length));
  const wordFits = longest * shrunk * CHAR_WIDTH_RATIO <= availableWidth;
  return { fontSize: shrunk, lines: wordFits ? maxLines : 1 };
}
