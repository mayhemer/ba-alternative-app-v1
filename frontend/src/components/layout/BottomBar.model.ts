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
