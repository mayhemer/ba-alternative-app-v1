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

const SPACE = 0x20;

/**
 * `baseFontSize` on up to `maxLines` lines when `text` is estimated to fit
 * `availableWidth` there, wrapped at word boundaries; otherwise
 * `TEXT_SHRINK_SCALE` of it. There is no third step: below the shrunk size the
 * label ellipsizes rather than becoming unreadable. When a word does not fit
 * a line even shrunk, the text engine would break it mid-word, so the label
 * keeps to one line and ellipsizes there instead.
 *
 * The words are wrapped greedily, as the text engine fills lines, a space
 * counting as a character, and no word may be wider than a line. One pass over
 * the characters, without splitting the text: a timeline's blocks fit their
 * labels by the hundred.
 */
export function fitText(text: string, availableWidth: number, maxLines: number, baseFontSize: number): TextFit {
  const charWidth = baseFontSize * CHAR_WIDTH_RATIO;
  // The wrap at the base size, while every word so far fits a line.
  let wraps = true;
  let lines = 1;
  let lineChars = 0;
  let longest = 0;
  let word = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && text.charCodeAt(i) !== SPACE) {
      word += 1;
      continue;
    }
    // A word ends here; repeated spaces end none.
    if (word === 0) {
      continue;
    }
    longest = Math.max(longest, word);
    if (wraps) {
      if (word * charWidth > availableWidth) {
        wraps = false;
      } else {
        const joined = lineChars === 0 ? word : lineChars + 1 + word;
        if (joined * charWidth <= availableWidth) {
          lineChars = joined;
        } else {
          lines += 1;
          lineChars = word;
        }
      }
    }
    word = 0;
  }
  if (wraps && lines <= maxLines) {
    return { fontSize: baseFontSize, lines: maxLines };
  }
  const shrunk = baseFontSize * TEXT_SHRINK_SCALE;
  const wordFits = longest * shrunk * CHAR_WIDTH_RATIO <= availableWidth;
  return { fontSize: shrunk, lines: wordFits ? maxLines : 1 };
}
