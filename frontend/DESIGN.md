# Festival App UX — Design Decisions

## General Principles

- Mobile-first, small screen, but web-ready as well. Thumb-friendly. Designed for festival conditions: sun, crowds, imprecision, altered states.
- Dark aesthetic. Restrained, elegant, functional. Aligned with Brutal Assault's industrial/military visual identity.
- Async actions always show progress indicator resolving to a tick. Never silent uncertainty.
- No onboarding. The UI teaches through use.

---

## Tech Stack

- React Native + TailwindCSS, Expo, single codebase for iOS, Android, Web
- React Navigation for screen and drawer navigation.
- Zustand or React Context for feeding TopBar/BottomBar with screen-specific and state-specific controls.
- React Native Reanimated + react-native-bottom-sheet for BottomTray spring animation and gesture handling.
- ArtistDetailScreen must be rendered as a modal-style overlay above the navigator stack (not a regular screen), as it overlays the TopBar when fully expanded.

---

## Navigation

### Side Drawer

- Swipe from left edge of screen opens the side drawer — edge-only, not a general left swipe.
- Hamburger button also opens it — placement TBD.
- Contains navigation between main sections: Artist List, Timeline, Settings, and future sections.
- Dismissed by tapping outside or swiping left.
- Exception: when ArtistDetailScreen is fully expanded, swipe-from-left closes the detail view instead of opening the drawer. Back button (TBD: TopBar or BottomBar) is used for navigation in this state.

### Top Bar

- Present on every screen. Two modes, no layout shift between them:
  - *Normal*: screen-specific controls (search, filters, hamburger TBD). Optional back button — placement TBD.
  - *Message mode*: momentarily hijacks content with a FeedbackMessage. Auto-dismisses after 2 seconds. Tap to dismiss early.
- Controls fed per screen and per screen state — not reimplemented per screen.
- Overlaid by ArtistDetailScreen when fully expanded.

### Bottom Bar

- Present on every screen. Content varies per screen.
- Back button candidate — placement TBD (TopBar vs BottomBar).
- Fed per screen similarly to TopBar.

---

## Interest / Star System

Three states, applied consistently across all views:

| State | Icon | Label (EN) | Label (CZ) |
|---|---|---|---|
| Default | ☆ empty star | Not interested | Nemám zájem |
| Maybe | ☆ empty star, accent color | Maybe want to see | Možná chci vidět |
| Must See | ★ full star | Must see! | Musím vidět! |

- Tap cycles state: none → maybe → must see → none.
- Visual state change is immediate. TopBar confirms via FeedbackMessage.
- Visual distinction must be strong — color weight, not fill level alone. Color progression: neutral → amber/dim → bright accent.
- Half-star must render crisply at small sizes.

---

## Top Bar — Feedback Zone

- FeedbackMessage variants: confirmation text, async progress indicator, tick on completion, warning.
- Example messages:
  - "Must see!"
  - "Maybe want to see"
  - "Removed"
  - "Orbital and Four Tet overlap" (shown as reaction to starring — see Conflict Detection)

---

## Artist List View

### Layout

- Scrollable list, alphabetical, with first-letter section separators.
- Include only `DbArtists.isPlayable` artists
- One row per artist: photo (from `DbArtist.thumbUrl`), name, genre (single fixed string from artist data), country, StarButton.
- Tapping a row opens ArtistDetailScreen fully expanded.

### Filtering

- Filter by interest state (none / maybe / must see).
- Text search on artist name.
- Filter controls live in TopBar.

---

## Artist Detail View

- Rendered as a modal overlay above the navigator stack.
- Reused from both Artist List and Timeline contexts.
- Contains: artist info, genre, country, photo, set time and stage/category (when timeline data is available), StarButton.
- The BottomTray is a specific collapsed state of ArtistDetailScreen — same component, different presentation state.

### States

**Collapsed (BottomTray) — from Timeline**
- Spring animates up from bottom, ~20–25% screen height.
- Shows artist name, category, time, StarButton, and partial content (e.g. partially visible photo) hinting at scrollable detail below.
- Exact partial content behavior TBD.
- Expand by swiping up. Dismiss by swiping down or tapping outside.

**Fully Expanded — from Artist List or by swiping up from BottomTray**
- Overlays full screen including TopBar.
- Closed by swipe-from-left gesture (overrides drawer gesture in this context).
- Back button visible — placement TBD (TopBar or BottomBar).

---

## Timeline View

### Layout

- 2D scroll canvas. Horizontal axis = time. Vertical axis = categories.
- Artist blocks sized proportionally to set duration.
- Each category is a horizontal swim lane.
- Fixed scale — no zoom. Default scale tuned empirically for a typical festival day (12–16 hours).

### Top Bar Controls

- Filter: "My schedule only" (shows only artists with maybe or must see state).
- Category management: hide/show/reorder category lanes.

### Now Line

- Persistent vertical line at current time, labeled "NOW". Always visible. Does not auto-scroll.

### Block Visual States

| State | Appearance |
|---|---|
| Default | Neutral dark block |
| Maybe | Amber border + background tint |
| Must See | Bright accent border + background tint |
| Selected (tray open) | White border highlight |

### Conflict Detection

- When starring an artist creates a Must See conflict, a warning is shown via TopBar FeedbackMessage.
- Visual conflict indicators on timeline blocks and proactive warnings: TBD future feature.

### Bottom Bar

- DaySwitcher.

---

## UI Component Inventory

### Layout
- `AppShell` — wraps every screen. Contains TopBar, ScreenContent, BottomBar.
- `SideDrawer` — overlays from left edge. Contains NavMenu.

### Top Bar
- `TopBar` — fixed top. Normal mode and Message mode. No layout shift between modes. Overlaid by ArtistDetailScreen when fully expanded.
- `FeedbackMessage` — renders inside TopBar. Variants: text confirmation, progress indicator, tick, warning.

### Bottom Bar
- `BottomBar` — fixed bottom. Content fed per screen.
- `DaySwitcher` — festival day selector. Lives in BottomBar on Timeline screen.

### Navigation
- `NavMenu` — navigation list inside SideDrawer. Links: Artist List, Timeline, Settings, future sections.

### Interest Control
- `StarButton` — three-state cycling button. Used in: ArtistRow, ArtistDetailScreen. Renders crisply at small sizes. Color-coded per state.

### Artist List
- `ArtistListScreen`
- `ArtistRow` — photo, name, genre, country, StarButton.
- `SectionSeparator` — alphabetical first-letter divider.
- `InterestFilterControl` — filter by star state. Lives in TopBar.
- `SearchBar` — artist name text search. Lives in TopBar.

### Artist Detail
- `ArtistDetailScreen` — modal overlay. Two presentation states: collapsed (BottomTray) and fully expanded. Reused from Artist List and Timeline contexts.

### Timeline
- `TimelineScreen` — 2D scroll canvas.
- `CategoryLane` — horizontal swim lane per category.
- `ArtistBlock` — proportional block. Interest state reflected in color/border. Tappable, opens ArtistDetailScreen in collapsed state.
- `NowLine` — persistent current time indicator.
- Let a day boundary be 06:00 (AM) rather than midnight, as some events are past midnight and should fall to the same day

---

## Open Topics for follow-on versions

- Hamburger menu button placement
- Back button placement (TopBar vs BottomBar)
- Partial content visible in collapsed ArtistDetailScreen (BottomTray state)
- "Expand" affordance design in collapsed state (swipe up hint, button, or both)
- BottomBar content for Artist List and Artist Detail screens
- Visual conflict indicators on timeline blocks (TBD future feature)
