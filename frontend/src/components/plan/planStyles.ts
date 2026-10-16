import type { TextStyle } from 'react-native';
import { colors } from '../../styling/tokens';

// Shared bits of My plan's look. Bold needs the bold face explicitly: the app's
// Text sets the regular family, and fontWeight alone does not switch it.

export const BOLD: TextStyle = { fontFamily: 'Bold-Default', fontWeight: '700' };

/** Small caps-style status label: LIVE, START. */
export const STATUS_LABEL: TextStyle = { ...BOLD, fontSize: 11, letterSpacing: 0.9, color: colors.textPrimary };

/** Tabular figures, so times and countdowns do not jitter as they change. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/** A live set's border: the accent at 60 %. */
export const LIVE_BORDER = 'rgba(232, 200, 74, 0.6)';

/** Width of the progress bar on a row's left edge, and of the gap rail's offset. */
export const PROGRESS_BAR_WIDTH = 6.5;

/** Width of the clash bar on a row's right edge. */
export const CLASH_BAR_WIDTH = 9.75;

/** The list's side gutter, which the now arrow sits in. */
export const LIST_GUTTER = 12;
