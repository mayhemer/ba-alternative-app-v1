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

## Elements and their sources

Each element computes what it shows in a pure model next to its component (`components/artist/`):

| Element | Model | Source |
|---|---|---|
| Title row | `ArtistDetailTitle.model.ts` | the artist, my pick, whether a set clashes, the content width: the name sized to the room the controls drawn leave (star, ⚠, ✕ on web), genre · country |
| A set | `ArtistSetRow.model.ts` | the set, its stage and category, its conflict entry: stage, **calendar** date (a set at 00:35 on Wednesday night reads "Thu 7"), time, "Overlaps with N other event(s)"; a tap goes to the festival day the timeline draws it on |
| Links | `ArtistLinks.model.ts` | the artist: streaming searches for a band, the web page's domain |
| Hero | `ArtistHero.model.ts` | the content width and the viewport height: 3:2, capped |
| Friends who picked it | `social/FriendPickList.model.ts` | the friends' picks: summary and rows |

The ⚠ and each set's overlap line come from the shared conflict calculation (`useConflicts`), the one
My plan, the timeline's bars and the drawer's count follow.
