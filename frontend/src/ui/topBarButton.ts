import type { ViewStyle } from 'react-native';
import { colors } from '../styling/tokens';

// ── A top-bar button, drawn open ──────────────────────────────────────────────
//
// The hamburger, the lens chip and My plan's filter chip show that their drawer
// or panel is open: an accent background with rounded corners, everything on
// it drawn black, as on the selected day button. The background reaches
// BUTTON_BLEED past the glyphs on either side: padding cancelled by a negative
// margin, so opening and closing move nothing.

/** What a button draws on its open background. */
export const TOPBAR_BUTTON_OPEN_CONTENT = colors.black;

const BUTTON_BLEED = 4;
const BUTTON_RADIUS = 8;

const CLOSED: ViewStyle = { paddingHorizontal: BUTTON_BLEED, marginHorizontal: -BUTTON_BLEED, borderRadius: BUTTON_RADIUS };
const OPEN: ViewStyle = { ...CLOSED, backgroundColor: colors.accent };

/** The button's frame: the open background, or none. */
export function topBarButtonFrame(open: boolean): ViewStyle {
  return open ? OPEN : CLOSED;
}
