# Navigation

## Side Drawer

- Swipe from left edge of screen opens the side drawer — edge-only, not a general left swipe.
- Hamburger button also opens it, and closes it when it is already open (both bars render
  above the drawer, so the button stays reachable); its label follows, "Open menu" or
  "Close menu". It sits in the TopBar's left slot normally, and in the BottomBar's left slot
  on short viewports where the TopBar is not rendered; on wide screens it is not rendered at
  all, because the drawer is permanent there (`DrawerButton`).
- Contains navigation between the main sections: My plan, Artists, Program, Support Program,
  Settings. Program and Support Program are listed only when the edition has categories to lay out
  their sets by (`hasTimelineCategories`), and My plan while either of them is, so before the
  schedule is published only Artists and Settings remain.
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
  conflict sheet, changing the lens filter. The now pill's switch from My plan to a timeline at
  now is one position.
- **What is not**: opening the drawer, the lens panel or the search, hidden categories, the
  typed query, and expanding the artist sheet from collapsed. A search's landing
  is a position (its screen, day and lens), so one back press returns from it. The drawer is
  left to React Navigation, which already closes it on back; the lens panel is closed
  by a back press but is never a place you return *to*.
- One user action is one back press, even when it moves several fields at once
  ("go to timeline" from the artist sheet changes screen + day + closes the sheet).
- Dismissing a sheet by swipe, backdrop or Escape is itself a backward move, so it
  never needs a second press to undo.
- **Search** ([search.md](search.md)) closes on Android back and web Escape like the lens panel,
  after any sheet open over it. Browser back on web does not close it.

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

## Feedback toast

- FeedbackMessage variants: confirmation text, async progress indicator, tick on completion, warning.
- A star press doesn't use the toast: it opens the **star selector** beside the star (see
  [interest-system.md](interest-system.md#star-selector)).
- **Next to what was tapped** (`toastPlacement()` in `shell/FeedbackToast.model.ts`), from the
  message's anchor (`FeedbackAnchor`):
  - **Share, Copy link, Revoke** ("My schedule" at the end of the lens panel and My plan's filter
    panel, which stay open): on the section heading's line, right-aligned, over the heading rather
    than in its flow (`SectionFeedbackToast`). Copy link says only the outcome, never the link:
    "Link copied", or "Could not copy the link" (`copyLinkFeedback`).
  - **Nothing on screen to sit next to** (an opened share link): right under the top bar, so the now
    pill in it stays visible; at the top of the screen in the short layout, which has no top bar.
- **Look**: a dark card lighter than every other surface (`toastSurface`), a light 1 pt border, 18 pt
  corners and a strong drop shadow (`FLOATING_SHADOW`, a `boxShadow`, the same on iOS, Android and
  web). White text, a white spinner, a green tick, a red warning sign.
- **It never covers a star button.** Under the top bar it stays in a band of the content column
  that stops `STAR_COLUMN_RESERVE` short of its right edge (`toastBand()`; the reserve is derived
  from the star sizes and hit slop in StarButton), so it can't land on the first row's star or the
  artist sheet's. Unit-tested across widths and insets.

## Elements and their sources

| Element | Model | Source |
|---|---|---|
| Drawer entries | `shell/SideDrawerContent.model.ts` (drawn by `DrawerItem`) | the active screen, whether each timeline has categories for its artists (My plan is listed while either timeline is), and the clash count of the shared conflict calculation (`useConflicts`), the one My plan follows |
| Lens chip | `features/social/LensChip.model.ts` (drawn by `LensChipView`) | the lens and the focused friend; the panel's open state |
| Lens panel | `features/social/LensPanel.model.ts` (each source a `LensScopeRow`) | the lens, the followed friends, the friend armed for removal |
| "My schedule" (ends the lens panel and My plan's filter panel) | `features/social/MyScheduleShare.model.ts` (drawn by `MyScheduleShareView`) | the session and the share |
| Settings | `screens/settings/SettingsScreen.model.ts` | the session (restoring, signed in, signed out, busy, error) and the editions |
