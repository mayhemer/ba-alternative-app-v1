# UI Component Inventory

## Layout
- `AppShell` — wraps every screen. Contains TopBar, ScreenContent, BottomBar.
- `SideDrawer` — overlays from left edge. Contains NavMenu.
- `LoadingScreen` — the one full-screen "waiting" presentation (spinner + caption),
  taking only the caption as a prop. Used by the startup splash ("Loading brutal
  data"), the timeline ("Loading schedule…") and the artist list ("Loading
  artists…"), which a cold start shows back to back — they are one component rather
  than three lookalikes so they cannot drift apart.

  A waiting state is only for *data not loaded yet*. "Nothing matches the current
  filters" is an answer, not a wait, and keeps its own empty-state message. Screens
  must also read the cache synchronously when they mount (`useState` initialiser,
  not a mount effect) — the cache is already populated by `StartupGate`, so deferring
  the read by a frame paints an empty list and flashes the empty-state message.

## Top Bar
- `TopBar` — fixed top. Normal mode and Message mode. No layout shift between modes. Overlaid by ArtistDetailScreen when fully expanded.
- `FeedbackMessage` — renders inside TopBar. Variants: text confirmation, progress indicator, tick, warning.

## Bottom Bar
- `BottomBar` — fixed bottom. Content fed per screen.
- `DaySwitcher` — festival day selector. Lives in BottomBar on Timeline screen.

## Navigation
- `NavMenu` — navigation list inside SideDrawer. Links: Artists, Program, Support Program, Conflicts, Settings.

## Interest Control
- `StarButton` — four-state cycling button (see [Interest / Star System](interest-system.md)). Used in: ArtistRow, ArtistDetailScreen. Renders crisply at small sizes. Color-coded per state.

## Artist List
- `ArtistListScreen`
- `ArtistRow` — photo, name, genre, country, StarButton.
- `SectionSeparator` — alphabetical first-letter divider.
- `SearchBar` — artist name text search. Lives in TopBar.

## Artist Detail
- `ArtistDetailScreen` — modal overlay. Two presentation states: collapsed (BottomTray) and fully expanded. Reused from Artist List and Timeline contexts.

## Timeline
- `TimelineScreen` — 2D scroll canvas.
- `CategoryLane` — horizontal swim lane per category.
- `ArtistBlock` — proportional block. Interest state reflected in color/border. Tappable, opens ArtistDetailScreen in collapsed state.
- `NowLine` — persistent current time indicator.
- Let a day boundary be 06:00 (AM) rather than midnight, as some events are past midnight and should fall to the same day

---

## Open Topics for follow-on versions

Resolved since — kept out of this list rather than left standing: hamburger placement (TopBar,
or BottomBar on short viewports), back navigation (platform back, no in-app button), collapsed
ArtistDetailScreen content (name, conflict marker, star, web-only ✕) and its expand affordance
(bottom-sheet swipe, plus the conflict marker which expands in place), and BottomBar content for
Artist List and Artist Detail (they contribute none; the bar renders only on short viewports, to
carry the hamburger and lens chip).
