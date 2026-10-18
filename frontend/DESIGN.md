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
- Hamburger button also opens it. It sits in the TopBar's left slot normally, and in the
  BottomBar's left slot on short viewports where the TopBar is not rendered; on wide screens it
  is not rendered at all, because the drawer is permanent there (`DrawerButton`).
- Contains navigation between the main sections: Artists, Program, Support Program, Conflicts,
  Settings.
- Dismissed by tapping outside or swiping left.
- Exception: when ArtistDetailScreen is fully expanded, swipe-from-left closes the detail view
  instead of opening the drawer. There is **no in-app back button** — backward movement is the
  platform's own (Android hardware back, web popstate), handled by `BackHistoryTracker`, plus a
  web-only ✕ in the detail header. See the back-history section above.

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

### Back history

Android's hardware back button — and the browser's back button on web — walk back
through *positions* the user has been in. A position is one tuple: the screen, the
selected festival day, the lens scope, and which sheet is open (artist / conflict).

- **What is a position**: switching section from the drawer nav, jumping to an event
  from the artist detail view, switching the day on a timeline, opening the artist or
  conflict sheet, changing the lens filter.
- **What is not**: opening the drawer or the lens panel, hidden categories, the artist
  list's search query, and expanding the artist sheet from collapsed. The drawer is
  left to React Navigation, which already closes it on back; the lens panel is closed
  by a back press but is never a place you return *to*.
- One user action is one back press, even when it moves several fields at once
  ("go to timeline" from the artist sheet changes screen + day + closes the sheet).
- Dismissing a sheet by swipe, backdrop or Escape is itself a backward move, so it
  never needs a second press to undo.

Implementation is two files — `navigation/backHistory.ts` (the stack, platform-free)
and `navigation/BackHistoryTracker.tsx` (observes the contexts, restores a position,
owns the per-platform trigger). Because positions are *observed* rather than pushed
by each call site, adding a screen or a new way of opening a sheet needs no changes.

Positions hold artist/event **ids**, re-resolved against the live cache when restored:
a reference that no longer exists (artist dropped by a cache refresh, conflict gone
after un-starring, friend removed) simply does not restore that part. The history is
in memory only — a cold start does not retrace the last session — and is thrown away
when the festival edition changes, since ids are scoped to an edition.

---

## Interest / Star System

Four states. Status values are the server's own (`InterestStatus` = `DbUserInterest['status']`),
with no conversion layer:

| State | Value | Icon | Label (EN) | Label (CZ) |
|---|---|---|---|---|
| Default | `none` | ☆ empty star, neutral | Not marked | Nemám zájem |
| Maybe | `maybe` | ⯪ half star, accent color | Maybe | Možná chci vidět |
| Must See | `will_go` | ★ full star, accent color | Must see! | Musím vidět! |
| Don't go | `dont_go` | ☆ empty star, red, struck through | Don't go | — |

- Tap cycles state, one tap = one step: none → maybe → will_go → dont_go → none (`INTEREST_CYCLE`).
- `dont_go` records "I listened and decided not to go", so a band once checked is never re-checked
  by mistake (and it can be counted). After it, "status ≠ none" means "I have checked this band".
- `dont_go` shows **only on the StarButton** (artist row, artist detail). Everywhere else it is the
  same as `none`: `isInterested()` (utils/interestUtils) is the one definition of "is a pick", used by
  the "my picks" lens, `StarIndicator` (timeline, conflicts, sheets), the timeline block's star width,
  and friends' schedules.
- It is stored on the server like any decision (PUT; only `none` is a DELETE) and returned in share
  data, but a viewer never shows it: friends' statuses pass through `isSharedStatus()` (maybe/will_go
  only — unknown statuses are dropped, never defaulted to maybe), both when fetched and when loaded
  from the friends cache.
- The struck star is an Ionicons outline with a drawn bar (`StarGlyph`), not a second icon font —
  that would have to be preloaded behind the splash (styling/fonts).
- Visual state change is immediate. A star tap shows the cycle-strip toast (see Feedback Zone).
- Visual distinction must be strong — color weight, not fill level alone. Color progression: neutral → amber/dim → bright accent.
- Half-star must render crisply at small sizes.

---

## Top Bar — Feedback Zone

- FeedbackMessage variants: confirmation text, async progress indicator, tick on completion, warning.
- A star tap passes the new status (`startProgress(label, status)`), and the toast shows the
  **interest cycle strip** (`InterestCycleStrip`): all four stars in tap order, the current one on a
  dark disc (`surfaceRaised`) drawn white, the others black and dimmed, its label beneath —
  the shapes tell the states apart. It shows the state and where
  the next tap goes. Repeated taps update it in place. No spinner or tick — they would only track the
  instant local write, and the star already shows the change; a failed save appends "⚠ not saved".
- **The toast never covers a star button.** It is shown right after a star tap while the user may
  tap on, and the stars sit at the right end of the artist row and of the detail header (which an
  expanded sheet lifts into the toast's height). So instead of centring on the screen, the toast is
  centred in a band of the content column that stops `STAR_COLUMN_RESERVE` short of its right edge
  (`toastBand()` in FeedbackToast; the reserve is derived from the star sizes and hit slop in
  StarButton). Unit-tested across widths and insets, and E2E-checked with real bounding boxes.
- Other messages are plain text in the same band.

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
- **Festival time.** Days (06:00 → 06:00), set times and day labels are always Europe/Prague time,
  whatever zone the device is in — someone planning from abroad sees the same timeline as someone on
  site (`utils/festivalTime`).

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

Shipped; the original TopBar warning toast was deliberately removed — it fired on every star
press and said nothing the block itself could not show.

- **Timeline blocks** carry 45° red / dark-red striped bars, one per overlap interval, each
  spanning only the overlapping portion of the block and laid over it
  (`ArtistBlock`).
- **Artist detail** shows an exclamation marker in the collapsed header (tapping it expands the
  sheet in place) and lists an "Overlaps with N other event(s)" row per conflicting event;
  tapping that opens `ConflictDetailSheet`.
- **Conflict sheet** (`ConflictDetailSheet`) shows one whole clash group: every set the group
  chains through its overlaps (`conflictGroupOf`, the groups My plan titles), from both the main
  and the support timeline, and nothing else. Its body, `ConflictTimeline`, is built from the
  timeline's own `CategoryLane`, `HourTicks` and `LaneLabelOverlay`, cut to the group's span plus
  exactly half an hour either side (`conflictWindow`), widened evenly to fill the sheet when that
  is narrower, so the clash stays centred. No lens, hidden lanes or scroll memory apply.
  Tapping a block opens the artist sheet.
- **ConflictsScreen** is a dedicated list of the current conflicts.
- Overlap computation lives in `src/utils/conflictUtils.ts`; `ConflictContext` holds the result.
  Only `must_see` counts today — including `maybe` is an open option (TODO in `conflictUtils`).

### Bottom Bar

- DaySwitcher.

### Progressive mount

The canvas is far larger than the viewport — roughly nine phone screens wide by
three tall — so a festival day's ~75 blocks amount to several hundred native
views of which about a tenth can be seen. Mounting a day in one go blocked the
UI thread for well over a second on a low-end Android at every day switch.

A day is therefore mounted in slices. `TimelineView` anchors a canvas window at
the offsets the day is about to be shown at — the persisted horizontal scroll
for that day, and the current vertical scroll — renders only the blocks inside
it, then grows the window by one viewport in every direction per frame until the
whole day is up. Lanes are always rendered at full height, so nothing reflows as
blocks appear.

The window only grows and stops once the day is complete, so a settled day
behaves exactly as it did before: scrolling and panning drive no JS render at
all. `CategoryLane` and `ArtistBlock` are memoised to make this work — without
them each expansion step would re-render everything already on screen. That is
also why a block takes `onPress(event, artist)` rather than a pre-bound closure:
the closure would be a new function on every lane render.

Blurred screens are frozen (`freezeOnBlur`), because the selected day is shared
by both timeline screens and a switch would otherwise repeat the whole mount for
one that is not on screen.

---

## UI Component Inventory

### Layout
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

### Top Bar
- `TopBar` — fixed top. Normal mode and Message mode. No layout shift between modes. Overlaid by ArtistDetailScreen when fully expanded.
- `FeedbackMessage` — renders inside TopBar. Variants: text confirmation, progress indicator, tick, warning.

### Bottom Bar
- `BottomBar` — fixed bottom. Content fed per screen.
- `DaySwitcher` — festival day selector. Lives in BottomBar on Timeline screen.

### Navigation
- `NavMenu` — navigation list inside SideDrawer. Links: Artists, Program, Support Program, Conflicts, Settings.

### Interest Control
- `StarButton` — four-state cycling button (see Interest / Star System). Used in: ArtistRow, ArtistDetailScreen. Renders crisply at small sizes. Color-coded per state.

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

Resolved since — kept out of this list rather than left standing: hamburger placement (TopBar,
or BottomBar on short viewports), back navigation (platform back, no in-app button), collapsed
ArtistDetailScreen content (name, conflict marker, star, web-only ✕) and its expand affordance
(bottom-sheet swipe, plus the conflict marker which expands in place), and BottomBar content for
Artist List and Artist Detail (they contribute none; the bar renders only on short viewports, to
carry the hamburger and lens chip).

Still open:

- Nothing currently tracked here — see `ROADMAP.md` for feature-level work.
