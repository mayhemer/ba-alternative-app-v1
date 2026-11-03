import { OVERLAY_PANEL_MARGIN, OVERLAY_PANEL_MAX_WIDTH } from '../../styling/tokens';

// ── The search field at the bottom edge ───────────────────────────────────────
//
// The field's place at the bottom of the content area, where the bottom bar was
// (hidden while the field is there, shell/BottomBar.model.ts), in the thumb's
// reach: the open search's field, which rises with the keyboard, and the entry
// the lens and filter panels show, the same pill in the same column, a little
// higher, so it is not missed.

/** Both fields: a pill, its ends half its height round. */
export const SEARCH_ENTRY = { height: 53, iconSize: 18 } as const;

/** The strip the field takes at the bottom edge, its margins included. */
export const SEARCH_DOCK_HEIGHT = SEARCH_ENTRY.height + OVERLAY_PANEL_MARGIN * 2;

/**
 * The panels' entry is raised by half its height off the bottom edge, so it is
 * not missed there. Opening the search moves the field to its own place, on
 * the keyboard.
 */
const ENTRY_BOTTOM = OVERLAY_PANEL_MARGIN + Math.round(SEARCH_ENTRY.height / 2);

/** The strip the panels' entry takes at the bottom edge: the panel card ends above it. */
export const SEARCH_ENTRY_DOCK_HEIGHT = ENTRY_BOTTOM + SEARCH_ENTRY.height + OVERLAY_PANEL_MARGIN;

/** Room between the last result and the field. */
const RESULTS_END_GAP = 16;

export type SearchDockFrame = {
  left?: number;
  right: number;
  width?: number;
  bottom: number;
  height: number;
  borderRadius: number;
};

/** The field's frame, with the keyboard down: the panels' column (inset on a phone, pinned right on a wide screen). */
export function searchDockFrame({ isWide }: { isWide: boolean }): SearchDockFrame {
  return {
    left: isWide ? undefined : OVERLAY_PANEL_MARGIN,
    right: OVERLAY_PANEL_MARGIN,
    width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
    bottom: OVERLAY_PANEL_MARGIN,
    height: SEARCH_ENTRY.height,
    borderRadius: SEARCH_ENTRY.height / 2,
  };
}

/** The panels' entry's frame: the open field's, higher (above). */
export function searchEntryFrame({ isWide }: { isWide: boolean }): SearchDockFrame {
  return { ...searchDockFrame({ isWide }), bottom: ENTRY_BOTTOM };
}

/**
 * How far the keyboard reaches into the content area, so how far the field
 * rises to sit on it. The content area ends at the safe area's bottom inset.
 * iOS measures the keyboard from the screen's bottom edge, so it covers that
 * inset first; Android (edge-to-edge, the window is not resized) reports it
 * above the navigation bar, which is that inset.
 */
export function keyboardLift({ platform, keyboardHeight, safeAreaBottom }: {
  platform: string;
  keyboardHeight: number;
  safeAreaBottom: number;
}): number {
  if (platform === 'ios') {
    return Math.max(0, keyboardHeight - safeAreaBottom);
  }
  return keyboardHeight;
}

/** The results list's bottom padding: its last row scrolls clear of the field, at its lift. */
export function searchResultsBottomPadding(lift: number): number {
  return SEARCH_DOCK_HEIGHT + lift + RESULTS_END_GAP;
}

/** At most this far from the top counts as at it (iOS can rest a fraction off). */
const AT_TOP = 1;

/**
 * Whether a scroll of the results gives the field the keyboard back: one that
 * started below the top and came to rest at it (or bounced past it). A drag
 * that starts at the top does not: it is the one that put the keyboard away.
 */
export function scrollRefocusesField({ from, to }: { from: number; to: number }): boolean {
  return from > 0 && to < AT_TOP;
}
