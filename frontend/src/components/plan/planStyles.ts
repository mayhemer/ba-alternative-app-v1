import type { TextStyle } from 'react-native';
import { colors } from '../../styling/tokens';

// Shared bits of My plan's look. Bold needs the bold face explicitly: the app's
// Text sets the regular family, and fontWeight alone does not switch it.

export const BOLD: TextStyle = { fontFamily: 'Bold-Default', fontWeight: '700' };

/** Small caps-style status label: LIVE, START. */
export const STATUS_LABEL: TextStyle = { ...BOLD, fontSize: 11, letterSpacing: 0.9, color: colors.textPrimary };

/** Tabular figures, so times and countdowns do not jitter as they change. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/** A live set's border, Must-see or Maybe: the full accent, to hold up in sunlight. */
export const LIVE_BORDER = colors.accent;

/** Width of the progress bar on a row's left edge, and of the gap rail's offset. */
export const PROGRESS_BAR_WIDTH = 6.5;

/** Width of the clash bar on a row's right edge. */
export const CLASH_BAR_WIDTH = 9.75;

/** The list's side gutter, which the now arrow sits in. */
export const LIST_GUTTER = 12;

/** Space below every item of the list: between two sets back to back, or a set and the gap rail. */
export const ITEM_SPACING = 6;

/** Size of the rail's end glyphs: the day's start ring and end square. */
export const CAP_GLYPH = 10;
