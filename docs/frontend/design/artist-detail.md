# Artist Detail View

- Rendered as a modal overlay above the navigator stack.
- Reused from both Artist List and Timeline contexts.
- Contains: artist info, genre, country, photo, set time and stage/category (when timeline data is available), StarButton.
- The BottomTray is a specific collapsed state of ArtistDetailScreen — same component, different presentation state.

## States

**Collapsed (BottomTray) — from Timeline**
- Spring animates up from bottom, ~20–25% screen height.
- Shows artist name, category, time, StarButton, and partial content (e.g. partially visible photo) hinting at scrollable detail below.
- Exact partial content behavior TBD.
- Expand by swiping up. Dismiss by swiping down or tapping outside.

**Fully Expanded — from Artist List or by swiping up from BottomTray**
- Overlays full screen including TopBar.
- Closed by swipe-from-left gesture (overrides drawer gesture in this context).
- Back button visible — placement TBD (TopBar or BottomBar).
