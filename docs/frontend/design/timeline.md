# Timeline View

## Layout

- 2D scroll canvas. Horizontal axis = time. Vertical axis = categories.
- Artist blocks sized proportionally to set duration.
- Each category is a horizontal swim lane.
- On the Support Program, overlapping sets of one lane stack in rows. The rows are counted from the
  sets the lane **shows** (after the lens): a lane is as tall as the most of its shown sets that
  overlap at once. A set the lens mutes takes its row as any other; one it removes takes none. The conflict sheet stacks its sets the
  same way. The Program draws its lanes one row tall.
- Fixed scale — no zoom. Default scale tuned empirically for a typical festival day (12–16 hours).
- **Festival time.** Days (06:00 → 06:00), set times and day labels are always Europe/Prague time,
  whatever zone the device is in — someone planning from abroad sees the same timeline as someone on
  site (`utils/festivalTime`).

## Landing on a set

A jump to a set (the artist sheet's "jump to timeline", search, the now pill's switch) selects its
day and centres its time and lane (`requestScrollToTime`). A jump that names a set (`eventId`)
lights its block: a plain accent frame for 3 s from when it is on screen, then gone, without a fade
(`features/timeline/landingHighlight`, `ui/LandingRing`); only that block renders again. A scroll to now names no set and lights nothing.

## Top Bar Controls

- Filter: "My schedule only" (shows only artists with maybe or must see state).
- Category management: hide/show/reorder category lanes.

## Now Line

- Persistent vertical line at current time, labeled "NOW". Always visible. Does not auto-scroll.
- **Source:** the shared minute clock (`useMinuteNow`, via `useNowX`), the same "now" as My plan and
  the now pill: floored to the minute, moved on each minute boundary and when the app returns to the
  foreground. The conflict sheet's now line follows it too. Written to a shared value outside React,
  so a new minute re-renders nothing.

## Elements and their sources

Each element computes what it shows in a pure model next to its component, in `src/features/timeline/` (shared with the conflict sheet and My plan), except `TimelineDay.model.ts`, which only the Timeline screen uses and so lives in `src/screens/timeline/`, and the conflict sheet's models, in `src/features/conflicts/`:

| Element | Model | Source |
|---|---|---|
| A set's block | `ArtistBlock.model.ts` | its set, its day and its row: position, width, label (size, lines, repeats), star, conflict bars |
| A lane and its title | `CategoryLane.model.ts` | the sets the lane shows: rows and height; the title from the same lane |
| A day's lanes | `TimelineDay.model.ts` | the cache, the screen's filter, the lens and the hidden lanes: which lanes, their tops, the canvas height, where the day lands |
| Now line | `NowLine.model.ts` | the minute clock (`useNowX`) |
| Ruler ticks | `TimeRuler.model.ts` | the day's 25 hours |
| Day buttons | `DayButton.model.ts` | the shown day and the minute clock (shared with My plan) |
| Conflict sheet | `ConflictTimeline.model.ts`, `ConflictDetailHeader.model.ts` | the clash group and the sheet's measured width; the header's calendar date |

### The lens on the timeline

- **Everything:** every set, my "don't go" sets included. This is the default view.
- **My picks / a friend's picks:** only the lens's picks; every other set is removed, as on the
  artist list (`isRemovedByLens`). A removed set takes no row on the Support Program.
- **Where a day lands:** at its first set listed. A day the lens leaves empty lands nowhere and
  keeps no scroll position.

Under every lens a block's look, star and conflict bars follow **your** picks (a friend's lens
shows their picks drawn by yours).

## Block Visual States

A block is filled in its stage's colour (`categoryBlockColors`, shared with My plan's rows). Its
look follows my pick; a pick's 3 pt left edge is the stage's brighter colour, drawn over the fill
by `ui/LeftEdge` (shared with My plan's rows; dots placed by `leftEdgeDots`). Every block keeps
the edge's 3 pt as padding, so the label sits in the same place with or without one.

| My pick | Appearance |
|---|---|
| Must-see | The fill, a **solid** left edge, and the star |
| Maybe | The fill, a **dotted** left edge (3 pt square dots, 3 pt apart), and the star |
| None | The fill only, no left edge |
| Don't go | No fill, no stage colour: a dotted grey 1 pt frame (`#4d4d4d`) all round, the text at 30%. The frame is the same width on every side because Android draws a dotted border only then |

The conflict sheet draws its blocks the same way.

**Back to back:** when the next set listed in a block's row starts exactly at its end, the block is
cut 1 pt short at its end, so the lane's surface shows through as a 1 pt separator
(`BLOCK_LAYOUT.separator`; `abutsNext` from `CategoryLane.model`). A set the lens leaves out
leaves no separator behind.

## Conflict Detection

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
  timeline's own `CategoryLane`, `HourTicks` and lane titles (`ConflictTimeline.model.ts`), cut to the group's span plus
  exactly half an hour either side (`conflictWindow`), widened evenly to fill the sheet when that
  is narrower, so the clash stays centred. No lens, hidden lanes or scroll memory apply.
  Tapping a block opens the artist sheet. The timeline scrolls sideways inside the sheet: the sheet's drag
  gesture gives up once a move goes 10 pt sideways (`failOffsetX`) and starts only after 10 pt up
  or down (`activeOffsetY`), or on Android it would take the touch from the scroller.
- **ConflictsScreen** is a dedicated list of the current conflicts.
- Overlap computation lives in `src/lib/conflictUtils.ts`; `ConflictContext` holds the result.
  Only `must_see` counts today — including `maybe` is an open option (TODO in `conflictUtils`).

## Bottom Bar

- DaySwitcher: the day buttons shared with My plan. The selected day is the one the screen shows;
  today's red ▼ notch is the festival day that holds now (`festivalToday`), following the same minute
  clock (`useFestivalToday`), so it moves to the next day at 06:00.

## Progressive mount

The canvas is far larger than the viewport — roughly nine phone screens wide by
three tall — so a festival day's ~75 blocks amount to several hundred native
views of which about a tenth can be seen. Mounting a day in one go blocked the
UI thread for well over a second on a low-end Android at every day switch.

A day is therefore mounted in slices. `TimelineView` anchors a canvas window at
the offsets the day is about to be shown at — the persisted horizontal scroll
for that day, and the current vertical scroll — renders only the blocks inside
it, then grows the window by one viewport in every direction per frame until
every set is up. A frame takes as many viewports as it needs to bring at least
one new set in, so no frame renders the lanes for nothing — a sparse day, such as
the Support Program's warm-up Tuesday, does not spend frames crossing the empty
canvas. Lanes are always rendered at full height, so nothing reflows as blocks
appear. Which blocks a window holds, and when the mount is complete, come from
one model (`features/timeline/mountWindow.ts`), read by both `TimelineView` and
`CategoryLane`.

The window only grows and stops once every set is in, so a settled day behaves
exactly as it did before: scrolling and panning drive no JS render at all. A set
that turns up outside it later — a sync, a lane shown again — makes the day
incomplete again, and the growth resumes. `CategoryLane` and `ArtistBlock` are memoised to make this work — without
them each expansion step would re-render everything already on screen. That is
also why a block takes `onPress(event, artist)` rather than a pre-bound closure:
the closure would be a new function on every lane render.

Blurred screens are frozen (`freezeOnBlur`), because the selected day is shared
by both timeline screens and a switch would otherwise repeat the whole mount for
one that is not on screen.
