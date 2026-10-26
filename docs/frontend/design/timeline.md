# Timeline View

## Layout

- 2D scroll canvas. Horizontal axis = time. Vertical axis = categories.
- Artist blocks sized proportionally to set duration.
- Each category is a horizontal swim lane.
- On the Support Program, overlapping sets of one lane stack in rows. The rows are counted from the
  sets the lane **shows** (after the lens): a lane is as tall as the most of its shown sets that
  overlap at once, and a set the lens hides takes no row. The conflict sheet stacks its sets the
  same way. The Program draws its lanes one row tall.
- Fixed scale — no zoom. Default scale tuned empirically for a typical festival day (12–16 hours).
- **Festival time.** Days (06:00 → 06:00), set times and day labels are always Europe/Prague time,
  whatever zone the device is in — someone planning from abroad sees the same timeline as someone on
  site (`utils/festivalTime`).

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

Each element computes what it shows in a pure model next to its component (`components/timeline/`):

| Element | Model | Source |
|---|---|---|
| A set's block | `ArtistBlock.model.ts` | its set, its day and its row: position, width, label (size, lines, repeats), star, conflict bars |
| A lane and its title | `CategoryLane.model.ts` | the sets the lane shows: rows and height; the title from the same lane |
| A day's lanes | `TimelineDay.model.ts` | the cache, the screen's filter, the lens and the hidden lanes: which lanes, their tops, the canvas height, where the day lands |
| Now line | `NowLine.model.ts` | the minute clock (`useNowX`) |
| Ruler ticks | `TimeRuler.model.ts` | the day's 25 hours |
| Day buttons | `DayButton.model.ts` | the shown day and the minute clock (shared with My plan) |
| Conflict sheet | `ConflictTimeline.model.ts`, `ConflictDetailHeader.model.ts` | the clash group and the sheet's measured width; the header's calendar date |

Under every lens a block's star and conflict bars follow **your** picks; the lens decides only which
sets are listed.

## Block Visual States

| State | Appearance |
|---|---|
| Default | Neutral dark block |
| Maybe | Amber border + background tint |
| Must See | Bright accent border + background tint |
| Selected (tray open) | White border highlight |

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
- Overlap computation lives in `src/utils/conflictUtils.ts`; `ConflictContext` holds the result.
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
