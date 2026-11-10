import { Platform } from 'react-native';

// Glyph advance as a fraction of font size, for Work Sans Bold, tuned by eye
// per platform. Deliberately above the font's mean advance (about 0.55): a
// larger value shrinks labels sooner, so more of a long name shows. A label of
// unusually wide glyphs may still ellipsize rather than shrink.
//
// Empirical, so no test checks these values: the tests of ui/textFit and of the
// labels it sizes replace this module with a fixed ratio.
export const CHAR_WIDTH_RATIO = Platform.select({
  ios: 1.0,
  android: 0.75,
  default: 0.75,
});
