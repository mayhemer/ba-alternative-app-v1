# Search

One search for every screen that shows events: My plan, Artists, Program and Support Program. It
answers "where and when is X?" and lands on the set, on the screen the user started from. A screen
switch happens only when the results say so in advance.

Interactive mock (2025 lineup): https://claude.ai/artifact/GbG9cyjFfM37dEt8BjB8jz (private). This
document wins over the mock wherever they differ.

## Opening and closing

- **Entry:** while the lens panel (Artists, Program, Support Program) or My plan's filter panel is
  open, a search field sits near the bottom edge, in the thumb's reach (`features/search/SearchEntry`):
  the open field's pill and its "Search", without its accent frame, raised by half its height, so
  it is not missed. Tapping it opens the search; the panel closes behind it.
- **Both fields** are the same pill (`SEARCH_ENTRY`: 53 tall, its ends half that round); the open
  one has the accent frame and a ✕.
- **The field's place** (`features/search/SearchDock.model.ts`): the bottom of the content area,
  where the bottom bar was; the panels' column (inset on a phone, pinned right on a wide screen).
  The bottom bar is out of sight meanwhile (layout-and-chrome.md). The panel's card ends above the
  entry (`searchEntryFrame`); the open field sits lower, at the bottom edge (`searchDockFrame`).
- **The search view** (`features/search/SearchView`) covers the content area and the bottom bar,
  under the top bar, which stays visible. On a wide screen it is a column pinned right, like the
  panels, and the rest (the permanent drawer included) stays in sight, dimmed; a tap there closes
  the search. The field, with its ✕, rises onto the keyboard. There is no Cancel button.
- **The field's ✕** (`searchFieldButton` in `SearchView.model.ts`): in a typed field (spaces count)
  it clears the text only; the search stays open, the field keeps the keyboard, and the screen
  behind is dimmed again. In an empty field it closes the search. Its label says which: "Clear
  search" or "Close search".
- **The keyboard:** the field rises with it and sits on it (`keyboardLift`: iOS reports the keyboard
  from the screen's edge, so the safe area under the content is taken off; Android, edge-to-edge,
  reports it above the navigation bar). On iOS the field moves with the keyboard; Android reports
  the keyboard once it is up, so the field follows a moment later. With the keyboard down the field
  sits at the bottom edge again.
- **Empty field:** the screen behind is dimmed, showing through at a fifth, as behind the panels
  (`OVERLAY_BACKDROP`). A tap on the dimmed area closes the search, so an accidental open is undone
  with one tap anywhere.
- **Typed field:** an opaque results list covers the area, top down, and scrolls under the field;
  its last rows scroll clear of the field and the keyboard. A drag puts the keyboard away. A scroll
  that started below the top and comes to rest at it (a drag, or the fling it ends with) gives
  the field the keyboard back (`scrollRefocusesField`); a drag that starts at the top does not, as it
  is the one that put the keyboard away.
- **Closing:** ✕ in an empty field, a tap on the dimmed area, Android back, web Escape, or a landing. A tap on the top
  bar (drawer button, now pill, the chip) closes the search **and then does what it always does**.
  Leaving the screen closes it too.
- The search is in the screen-exclusivity hub (`utils/overlayHub`) with the drawer and the two
  panels: opening one closes the others. The artist and conflict sheets and the star selector are
  close-only members: they open over these without closing them, and only `closeAll` closes them,
  together with everything else (a now pill tap, a lock-screen now card tap).
- It opens empty every time. Opening it is not a back-history position; a landing is.

## What is searched

- **Every set of the edition**, bands and support programme alike, so a search never answers
  "nothing found" for something that is on another screen.
- **Artists with no set** (before the schedule is published, a cancelled meet & greet, a late
  addition): one result each.
- **Names only**, case- and accent-insensitive ("skalmold" finds SKÁLMÖLD), any part of the name.
- **Order:** the name starts with the query, then a word in it does, then anywhere; within each,
  by start time, artists with no set last.
- **Results from the first character**, at most **30 rows**, cut in display order (this screen's
  own section first). When cut, the list ends with "N more. Type more to narrow it down."
- Typing is urgent, the results deferred (`useDeferredValue` on the query): a keystroke shows in the
  field at once, and a newer one throws away the results render of the previous one. Closing
  during a results render is urgent too.

## Sections: here and elsewhere

Each result is placed by the screen it was opened on (`features/search/searchScope.ts`):

| Screen | This screen's section | "In the Program" | "In the Support Program" |
|---|---|---|---|
| Program | "Program": bands' sets | — | opens there (switches screen) |
| Support Program | "Support Program": support sets | opens there (switches screen) | — |
| My plan | "My plan": sets any plan filter can list | opens details | opens details |
| Artists | "Bands": every band, opens details | — | opens details |

- **This screen's section:** a tap lands on the set here. If the screen's filter hides it, the
  filter widens just enough first, and the row says so with a small tag, in blue after the time, with
  no frame:
  - Program / Support Program: a set in a hidden lane shows its lane again; a set the lens
    leaves out (under My picks or a friend's lens, every set but its picks) turns the lens to
    Everything.
  - My plan: the filter steps out from where it is: Only conflicts → Must-see only → Must-see and
    Maybe → All sets, to the first that lists the set.
- **The other sections** are named by where the set is, never by what is missing. On My plan,
  where All sets lists my "don't go" bands too, "In the Support Program" holds support sets I
  haven't picked or marked "don't go", and those over 3 h. A band's set over 3 h is on My plan as
  any other.
- **An artist with no set** goes to the section where the artist belongs, and a tap opens only the
  artist sheet: there is nothing to land on.
- **Details:** the artist sheet opens **over the results**, expanded, as from the artist list (a
  result is picked to read about it), and the keyboard goes away. Closing it returns to them; the
  keyboard comes back only when the field is tapped. The sheet's
  "Timeline ›" navigates, and that ends the search.

Each screen's section uses the same rule the screen draws with, never a search-only one:
- which timeline a set is on: `onSupportProgram` in `lib/timelineJump.ts`;
- what the lens removes from a timeline: `isRemovedByLens` in `lib/interestUtils.ts`, also used by
  `TimelineDay.model`;
- which sets My plan can list, and under which filter: `planPicks` and `planLevelLists` in
  `lib/plan.ts`, also used by `buildPlanDay`.

## A result row

- Two lines at a fixed height (`SearchResultRow.model.ts`), easy to press, and a list that lays out
  without measuring:
  - the name in the regular weight, the matched part in the accent colour;
  - the festival day, the time and the stage: `Fri · 19:00–20:00 · Marshall`. Day and time are the
    festival's (06:00 → 06:00, Europe/Prague), as everywhere.
- No fill of its own: the list's background shows through, and only a pressed row is filled
  (`surfacePressed`). No frame, no rounding, no line between rows, 12 apart (`SEARCH_LIST.rowGap`).
  No colour bar: nothing in a row follows the set's category. The text starts 14 from the row's
  edge (`SEARCH_ROW.textInset`).
- My star on the right (Must-see, Maybe, Don't go), as on the artist list.
- **An artist with no set:** the name, then genre and country, the line its artist sheet shows
  under the name (`artistGenreCountry` in `ArtistDetailTitle.model.ts`, the source both follow);
  either part only when known, and with neither the line stays empty, at the same height. No
  "no time yet" label repeated on every row.
- Past sets look like any other.
- A set that repeats on several days is one row per day.

## Landing and highlight

Search lands through the scroll-to the app already has; it adds no path of its own.

- **Program / Support Program:** `useJumpToTimeline` → `requestScrollToTime`, which now carries the
  set's `eventId`. The artist sheet's jump uses the same, so it gets the highlight too. A "now"
  scroll (day button, now pill) carries no set and never highlights.
- **My plan:** the plan store's request to land, which used to mean only "now", can name a set; the
  screen scrolls that row a third down the list, held within what the list can scroll.
- **Artists:** every result opens the artist sheet.
- **Highlight:** the landed set's block or row gets a plain accent frame: no tint, no animation
  while it shows. It shows for 3 s counted from when the frame is put on screen, then it is gone,
  without a fade (`features/timeline/landingHighlight.ts`, `ui/LandingRing`). The frame ends its own
  landing: a clock started with the landing raced the screen switch and the day's mount, and on a
  phone the frame came too late and was cut short or never shown. A landing whose set is never
  drawn ends by itself after 10 s. Only the element whose highlight changes renders again.
