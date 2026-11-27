import { OVERLAY_PANEL_MARGIN, OVERLAY_PANEL_MAX_WIDTH } from '../styling/tokens';

// ── The column the overlay panels and their search field take ─────────────────
//
// The lens and filter panels' cards and the search field under them
// (features/search/SearchEntry) stand in one column across the screen:
//   - an upright phone: across it, inset from both edges;
//   - a turned phone (not wide, wider than tall, as My plan's landscape
//     timeline): the middle 70%, centred, so a panel does not stretch across
//     a short, long screen. In percent of the panel's own area, which is
//     inside the safe area, so it stays centred between the side insets;
//   - a wide screen: at most OVERLAY_PANEL_MAX_WIDTH, pinned right, under the
//     chip that opens the panel, clear of the permanent drawer.

/** A turned phone's column is inset this far from either side: the middle 70%. */
const TURNED_PHONE_INSET = '15%';

export type OverlayPanelColumn = {
  left: number | `${number}%` | undefined;
  right: number | `${number}%`;
  width: number | undefined;
};

export function overlayPanelColumn(screen: { isWide: boolean; width: number; height: number }): OverlayPanelColumn {
  if (screen.isWide) {
    return { left: undefined, right: OVERLAY_PANEL_MARGIN, width: OVERLAY_PANEL_MAX_WIDTH };
  }
  if (screen.width > screen.height) {
    return { left: TURNED_PHONE_INSET, right: TURNED_PHONE_INSET, width: undefined };
  }
  return { left: OVERLAY_PANEL_MARGIN, right: OVERLAY_PANEL_MARGIN, width: undefined };
}
