# Navigation

## Side Drawer

- Swipe from left edge of screen opens the side drawer — edge-only, not a general left swipe.
- Hamburger button also opens it, and closes it when it is already open (both bars render
  above the drawer, so the button stays reachable); its label follows, "Open menu" or
  "Close menu". It sits in the TopBar's left slot normally, and in the BottomBar's left slot
  on short viewports where the TopBar is not rendered; on wide screens it is not rendered at
  all, because the drawer is permanent there (`DrawerButton`).
- Contains navigation between the main sections: Artists, Program, Support Program, Conflicts,
  Settings.
- Dismissed by tapping outside, swiping left, or the hamburger.
- Exception: when ArtistDetailScreen is fully expanded, swipe-from-left closes the detail view
  instead of opening the drawer. There is **no in-app back button** — backward movement is the
  platform's own (Android hardware back, web popstate), handled by `BackHistoryTracker`, plus a
  web-only ✕ in the detail header. See the back-history section above.

## Top Bar

- Present on every screen. Two modes, no layout shift between them:
  - *Normal*: screen-specific controls (search, filters, hamburger TBD). Optional back button — placement TBD.
  - *Message mode*: momentarily hijacks content with a FeedbackMessage. Auto-dismisses after 2 seconds. Tap to dismiss early.
- Controls fed per screen and per screen state — not reimplemented per screen.
- Overlaid by ArtistDetailScreen when fully expanded.

## Bottom Bar

- Present on every screen. Content varies per screen.
- Back button candidate — placement TBD (TopBar vs BottomBar).
- Fed per screen similarly to TopBar.

## Back history

Android's hardware back button — and the browser's back button on web — walk back
through *positions* the user has been in. A position is one tuple: the screen, the
selected festival day, the lens scope, and which sheet is open (artist / conflict).

- **What is a position**: switching section from the drawer nav, jumping to an event
  from the artist detail view, switching the day on a timeline, opening the artist or
  conflict sheet, changing the lens filter. Jumping to a set from the now pill on My plan is
  the same position change as the artist sheet's jump, and a day button's switch between My
  plan and a timeline (screen and day) is one position too.
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

## Elements and their sources

| Element | Model | Source |
|---|---|---|
| Drawer entries | `shell/SideDrawerContent.model.ts` (drawn by `DrawerItem`) | the active screen, whether each timeline has categories for its artists, and the clash count of the shared conflict calculation (`useConflicts`), the one My plan follows |
| Lens chip | `features/social/LensChip.model.ts` (drawn by `LensChipView`) | the lens and the focused friend; the panel's open state |
| Lens panel | `features/social/LensPanel.model.ts` (each source a `LensScopeRow`) | the lens, the followed friends, the friend armed for removal, the session and the share |
| Settings | `screens/settings/SettingsScreen.model.ts` | the session (restoring, signed in, signed out, busy, error) and the editions |
