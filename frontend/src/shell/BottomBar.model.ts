// ── The bottom bar: how it is shown ───────────────────────────────────────────
//
// A solid row under the content when the screen has something for it; nothing
// otherwise. On a short viewport the TopBar is not rendered, so the bar carries
// its controls (the drawer button, the screen's right-hand chip) and floats over
// the content — even on a screen that adds nothing of its own.

export type BottomBarMode = 'hidden' | 'row' | 'floating';

export function bottomBarMode({ hasContent, isShort }: { hasContent: boolean; isShort: boolean }): BottomBarMode {
  if (isShort) {
    return 'floating';
  }
  return hasContent ? 'row' : 'hidden';
}

/**
 * Whether the bar is in sight: not while the search field holds the bottom
 * edge, which it does while the search or the lens or filter panel is open
 * (features/search/SearchDock.model.ts). Hidden, it keeps its place, so the
 * screen above keeps its height and does not lay out again.
 */
export function bottomBarInSight({ searchOpen, lensPanelOpen, planPanelOpen }: {
  searchOpen: boolean;
  lensPanelOpen: boolean;
  planPanelOpen: boolean;
}): boolean {
  return !searchOpen && !lensPanelOpen && !planPanelOpen;
}
