# My plan: design

The "My plan" screen is the festival-time view of your own picks. It answers three questions at a glance: **what is happening now, what is next, and how long until it starts**. It replaces the old Conflicts screen. Conflicts are shown inside the plan, and a filter keeps the old planning use.

Status: **implemented** (2026-10-16, branch `my-plan-screen`). The interactive mockup is the visual reference: https://claude.ai/artifact/SV4HR7nh3sod4MrJxBKfw4 (private; open it with the owner's account). This document wins over the mockup wherever they differ.

Related: [overview.md](../../general/design/overview.md) (app-wide design), [layout-and-chrome.md](layout-and-chrome.md) (layout modes, chrome).

---

## Principles

- **Today, now, next first.** Other days are reachable, but never compete with today.
- **Glanceable in the field.** Dark, bright sunlight, one hand. High contrast, no reading required for the core answer.
- **Minimum elements, tight together.** The list already carries a lot of signal; new elements must earn their place.
- **Localization-ready.** Say it with icons, numbers and bars rather than phrases. The few words used are short labels. Layouts must survive Czech copy about 40% longer: names and stages truncate with an ellipsis, and statuses never wrap.

---

## Screen structure

```
┌──────────────────────────────────────────┐
│ ☰  ( ● GOJIRA           −37 min )  ½⋮    │  top bar: drawer, now pill, filter chip
├──────────────────────────────────────────┤
│ ○                                        │  start cap: ring, then 20 min of bare rail
│ ┊                                        │
│ ┌──────────────────────────────────────┐ │
│ │ 14:00–14:40  Hooded Menace           │ │  past → dimmed, "done"
│ │ done                          Octagon│ │
│ └──────────────────────────────────────┘ │
│ ┊             2 h 25                     │  gap: height ∝ duration, label
│ ┌──────────────────────────────────────┐ │
│▶┃ 19:00–20:00  Gojira                 ▓│ │  live: yellow left progress, red arrow
│ ┃ ● LIVE −37 min          Jägermeister▓│ │  clash: striped bar on the right edge
│ └──────────────────────────────────────┘ │
│                          ⚠ Conflict      │  floating group title
│ ┌──────────────────────────────────────┐ │
│ │ 19:40–20:30  Batushka               ▓│ │
│ │ START −17 min             Metal Gate │ │  clashes with the live set
│ └──────────────────────────────────────┘ │
│ ┊             2 h                        │
│   …                                      │
│ ┊                                        │  end cap after the last set
│ ■                                        │
├──────────────────────────────────────────┤
│  [THU 7▾] [FRI 8] [SAT 9] [SUN 10]       │  day switcher, always visible
└──────────────────────────────────────────┘
```

- **Same sets as the conflict calculation.** My plan lists exactly the sets the conflict calculation considers, through one shared rule (`conflictUtils.isConflictEligible`). Sets longer than 2 hours (all-day exhibitions, say) are out of both: not listed, not in the now pill, never clashing. The plan and the conflict logic must stay on one source feed and one rule. A change to either goes through the shared logic, never a plan-only or conflict-only filter or count.
- **One model per element.** Every element (set row, gap, cap, spacer, empty day, now pill) has a pure model next to its component (`screens/my-plan/<Element>.model.ts`). The model computes everything the element shows: height, texts, progress, where the now arrow sits. It works from the raw inputs that element depends on, and the component draws only the model. `buildPlanDay` decides only which elements a day lists, and in what order. Height and label can't disagree because they come from the same inputs: a gap drawn as 2 h says `2 h`.
- **One festival day per view.**
- Festival days run **06:00 → 06:00** (`DAY_BOUNDARY_HOUR`), so a 00:30 set belongs to the previous day.
- All times are in festival time (`festivalTime.ts`).

---

## Top bar

### Now pill (centre)

On every screen that has a top bar. On festival days it replaces the logo while it has something to say.

| State | Content | Progress |
|---|---|---|
| **Live** | left: red dot (7 pt), band name (bold, ellipsis); right: time left (bold accent): `● GOJIRA ……… −37 min` | 3 px bar along the bottom: accent for what remains, dark `livePassed` `#4a3f17` filling it for the elapsed fraction |
| **Live, clash** | the live Must-see that **ends soonest**, then a red `warning-outline` glyph (13) at the far right; no count | same |
| **Break** | centred: time to the start (bold blue `#5b9bff`), a chevron (`textMuted`), band name: `−1 h 30 › NAPALM DEATH` | none |
| **Otherwise** | the logo | — |

- **Break window:** from the end of today's last finished Must-see (or **08:00** if none has finished yet) to the next Must-see today. Between 06:00 and 08:00, and after the day's last Must-see, the pill shows the logo.
- **Source:** today's Must-sees only. The pill ignores both plan filters. With Maybes shown, the list's break or gap can count down to a Maybe while the pill counts down to the next Must-see. That's intended: the list draws a countdown to a Maybe in a dashed box (see [Gaps](#gaps)), so the two read apart.
- **No words:** the dot, the colours and the arrow carry the state, so nothing needs translating. The accessibility label still says it: `GOJIRA LIVE −37 min`, `NAPALM DEATH START −1 h 30`.
- **Text:** 12.6 pt bold (10 % under the plan rows' 14 pt), to fit more of the band name, which the festival feed sends in capitals. Times join their numbers and units with narrow no-break spaces (U+202F): about half a space each, without running `37min` together.
- **Size:** the whole centre between the side slots (56 pt each; the lens and filter chips are 38 pt, right-aligned), 8 pt in from each, so 26 pt clear of the right chip. 36 pt tall (tap area extended to 44 pt with `hitSlop`), radius 18, 1 px `borderMid` border, `surfaceRaised` background, 12 pt padding, 7 pt gaps.
- **Pressed:** while a finger is down, the background steps up from `surfaceRaised` to `surfacePressed` (`#262626`), as a button's does.
- **Conflicts:** the pill never cycles or animates. Motion at the top of every screen is distracting, a mid-glance switch is unreadable, and it ignores the reduce-motion setting.
- **Tap:** switches between My plan and the timeline (`nowPillTap`). Back returns to the previous screen through the existing back history.
  - On any other screen: opens My plan on **today, scrolled to now**.
  - On My plan: shows **the pill's set on its timeline**, the way the artist sheet's set line does (`useJumpToTimeline`): the Program or the Support Program, the festival day it is drawn on, scrolled to the set and its lane. In a clash that is the set the pill names, the one ending soonest. My plan's own "now" is a tap on today's day button.
  - The set comes from the same selection as the pill's text (`nowPillTarget` and `nowPillModel` share `pillSet`), so the tap always goes to the set the pill names.
  - The logo is not a button.

### Filter chip (right, My plan only)

- **Shape:** the same "state + ⋮" frame as the lens chip on Artists and Program (`TopBarChip`): a 24 pt state slot right against a 14 pt slot for the dots, 38 pt in all. The dots slot is narrower than the 20 pt glyph, whose dots are a thin column in its middle; 14 pt keeps them clear of a friend avatar's star badge.
- **State slot:**
  - the ½ star, accent and half-filled when Maybe picks are shown, a grey outline when they're hidden;
  - or a **red ⚠** while "Show only conflicts" is on.
- **⋮** turns accent while the panel is open.
- **Panel:** tapping drops a panel from under the top bar, like the lens panel, with a dimmed backdrop. It holds two switches:
  - **Show Maybe picks** (½ star, accent switch). Default **off**.
  - **Show only conflicts** (⚠, red switch). Default **off**. The Maybe switch dims to 40% while this is on.
- **Persistence:** both filters are saved through `uiStatePersistence`.

---

## The list

Item spacing is 6 px, with 12 px side padding.

What each element shows comes from its own model (see Principles), built from these inputs:

| Element | Built from | Shows |
|---|---|---|
| Set row | the set, its artist and stage, now, its overlaps with other Must-sees, the Must-sees live now, whether it heads a clash group | time range, stage, status (`LIVE −x`, `START −x`, `done`), progress, now arrow, clash bars |
| Gap | where it starts (the end of everything listed above) and the set listed right under it with its pick level, now | length or countdown (boxed when it counts to a Maybe), height, fill, now arrow, the conflict title of the group under it |
| Day-start break | a gap from 08:00 to the first **listed** set | as a gap, with the start ring |
| Cap / spacer | its edge, or the clash group under it; the end cap also the end of everything listed, the shown day, now | the rail end, the conflict title of the group under it; the end cap the now arrow once the day's listed sets are over |
| Empty day | whether only conflicts are shown | its sentence |

### No day title

- The list has no day title: the day switcher already names the shown day, and a title at the top of the list only repeated it and made it harder to find your place. The list opens with the start cap, or with the day-start break while it runs.

### Must-see row

- **Box:** 58 pt tall, square corners, in its **category's colours, as on the timeline** (`categoryBlockColors`): the block's background, and a 1 px border in the brighter colour of the block's left edge. A live row's border is the full accent (`LIVE_BORDER`), as a live Maybe's, to hold up in sunlight.
- **Fixed inset for every row type and state:** content starts 18 pt from the left edge (1 + 17) and ends 23 pt from the right (1 + 22). The time, name and stage columns always line up, clear of the left progress bar and the right clash bar.
- **Line 1:** `HH:MM–HH:MM` (13, `textMuted`, tabular figures), then the band name (15 bold, ellipsis).
- **Line 2:** the status on the left, the stage right-aligned (13, `textSecondary`, ellipsis). Statuses:
  - *live*: `● LIVE` (red dot, 11 bold caps), then `−37 min` (14 bold accent).
  - *upcoming, clashing with a Must-see that is live now*: `START` (11 bold caps), then `−17 min` (14 bold **red**). It tells you how long you can stay at the live band.
  - *past*: `done` (12, `textMuted`); the whole row at 45% opacity. Only during the festival: outside it (before or after) every set reads as upcoming, with no live bars, current gaps or arrows.
  - *upcoming otherwise*: empty. The countdown lives in the gap and the pill.
- **Live progress:** a 6.5 pt bar on the left edge: accent for what remains, dark `#4a3f17` growing top → bottom with the elapsed fraction. Every progress bar (now pill, live rows, current gap) reads the same way: passed dark, remaining light (`PROGRESS_COLORS`).
- **Tap behaviour:** see [Taps](#taps).

### Maybe row

- Hidden unless "Show Maybe picks" is on.
- **Look:** 26 pt tall, one line: `time · name · stage` (13, `textMuted`). Muted, but bright enough to read in sunlight.
- **Box:** a **1 px dashed** border in the category's border colour (as Must-see rows) and no background, with the same fixed insets as Must-see rows.
- Never marked as a clash, and never part of conflict logic.
- **Live:** a solid border in the full accent (`LIVE_BORDER`) instead of the dashed one, a red dot (7 pt) right before the name, a grey 6.5 pt left bar (`#8a8a8a` for what remains, `#333` filling it for the elapsed fraction) and the now arrow. The dot moves only that row's name, by its width and gap.

### Gaps

- A gap is the time between the end of the previous group of sets and the next set's start. Overlapping sets have no gap between them.
- **Height:** `min(160, 20 + 0.5 · minutes)` pt.
  - Every non-zero gap is at least 20 pt, so its label always fits.
  - Above that the height is linear, so 35 min (38 pt) and 2 h (80 pt) read clearly differently. Compressing curves (√, ln) were tried and rejected: they made 35 min look almost like 2 h.
- **Label:** the duration, centred (12, `muted`): `45 min`, `2 h 25`.
- **Rail:** a 2 pt **dotted** `#333` line, offset 6.5 pt from the left (the width of the row's left bar).
- **The current gap** (now falls inside it):
  - at least 44 pt tall;
  - a blue 6.5 pt left bar (`#5b9bff` for what remains, `#1c2f52` filling it for the elapsed fraction);
  - the now arrow;
  - a centred countdown `−1 h 20` (15 bold blue);
  - counting down to a **Maybe** (the set listed under it is one), the countdown is 13 regular blue in a 1 pt **dashed** blue box (radius 4, 8 pt side padding): the Maybe's own outline. It tells the list's countdown to a Maybe apart from the now pill's, which always counts to the next Must-see.

### Day caps

- They close the day off at both ends, symmetrically: a **start cap** above the day's first set and an **end cap** below its last.
- Each is a bare gap rail as long as a 20 min gap (`gapHeight(20)`, 30 pt), with no label and no time behind it.
- **Start:** a hollow ring (10 pt, 2 pt stroke, rail colour) centred on the rail at the top.
- **End:** a filled square (8 pt, rail colour) centred on the rail at the bottom.
- While the day-start break runs, the break opens the list instead of the start cap, with the ring at its top.
- The first set's `⚠ Conflict` title floats in the start cap like in any gap, so no spacer is needed.
- The start cap never carries the now arrow. The end cap carries it, centred on its square, from the minute the last **listed** set ends until the 06:00 day change.
- None in conflicts-only mode, or on an empty day.

### Day-start break

- On today, from **08:00** until the first listed set starts, the list opens with a break. With Maybes shown, that set can be a Maybe; the now pill still counts down to the first Must-see.
- It looks like a current gap: blue bar from 08:00, the arrow, `−3 h`. It takes the start cap's place, with the cap's ring at its top; the blue bar starts below the ring, as far clear of it as two back-to-back sets are apart (6 pt item spacing; 16 pt down), so its fill and the arrow measure the break from there.
- None outside that window, on a day with no Must-see, or in conflicts-only mode.

### Now arrow

- A red (`danger`) triangle, 16 × 24 pt, with a 1 pt white outline. Its tip reaches about 4 pt into the row, halfway across the 6.5 pt progress bar, and it is drawn over the row. Red is the now colour across the app (the timeline's now line, the live dot).
- Its centre sits at the **tip of the progress fill**: on a live row (Must-see or Maybe), in the current gap, or in the day-start break. Once the last listed set has ended it sits on the end cap's square instead, as there is no fill left.
- With two live sets there are two arrows. Rows aren't on a shared time scale, so each arrow means "this far into this set".
- No arrow before the festival.
- After the day's last listed set ends the end cap carries the arrow until the 06:00 day change; from then the day is past and has no arrow. (An "End of the day" marker that carried it was tried and dropped; the end cap does the job without an extra element.) Opening My plan at now then scrolls to the end cap.
- A full-length "now line" was tried and dropped. It sat at the screen edge (rounded corners, cases, the back-swipe zone), was the brightest element with the weakest meaning, and duplicated the dimmed past rows.

### End of the day and empty day

- The list ends with the end cap below the day's last set; there is no text marker.
- **Empty day:** centred text:
  - "Nothing planned for this day" / "Na tento den nic v plánu";
  - in conflicts-only mode: "No conflicts on this day" / "V tento den žádné konflikty".

---

## Conflicts

- **Which sets clash:** Must-see × Must-see only, using the same calculation as the timeline (`computeConflictOverlaps`). Sets over 2 h never clash (`eventsOverlap`).
- **Clash bar:** on the row's **right edge**, 9.75 pt wide.
  - Each overlap interval is drawn at its place along the row's start → end, top to bottom.
  - Same stripes as the timeline's conflict bar: `danger` / `dangerMuted`, 2 pt each, at 45°.
  - In the app, reuse `stripePath` from `src/ui/stripes.ts` (SVG). `patternTransform` is ignored on iOS.
- **Group title:** `⚠ Conflict` (13 regular, `danger`, right-aligned) sits just above the first row of each clash group.
  - Groups follow `computeConflictEntries`' leader rule.
  - It's drawn at the bottom edge of the cell above the group (the gap or the reserved spacer), absolutely positioned, so it doesn't change the layout. Drawing it from the row itself would put it outside the row's list cell, and on Android a cell takes no touches outside its own bounds.
  - When the group has no gap above it (back to back), a 24 pt spacer is reserved so the title never overlaps the row above.
- **Show only conflicts:**
  - Only clashing Must-sees are listed. No gaps, no day-start break, no Maybe rows.
  - Every clash group gets the 24 pt spacer.
- **Day buttons:** while "Show only conflicts" is on, a day with at least one Must-see clash gets a 6 pt striped strip on the button's right edge, in the same pattern. It's a different shape from today's red ▼ notch, so the two red marks can't be confused.

---

## Day switcher and scrolling

- **Bottom bar:** the timeline's day buttons (`DayButtons`), always visible. The selected day is filled accent, and today has a red ▼ notch.
- **Sources** (`PlanDaySwitcher.model.ts`, each button's own model in `DayButton.model.ts`):
  - **today** is the festival day that holds now (`festivalToday`: 06:00 to 06:00). The list's "during the festival" follows the same rule.
  - **the clash stripes** come from `daysWithClash`, the conflict calculation the conflicts-only list follows, so a striped day is exactly a day that list has sets on. A clash across 06:00 stripes both days its sets start on.
- **Default day:**
  - today;
  - before the festival, day 1;
  - after it, the last day.
- **Which day is remembered:**
  - The selected day is kept while you move around the app.
  - After a cold start, or once a new festival day begins (06:00), My plan opens on today.
- **Scroll position:** remembered **per day**, like the timeline (`uiStatePersistence`, a My plan screen key, y offsets).
  - Only the user's own scrolling is remembered. The screen's own landing scroll is not saved: today's landing is "now", which moves, and a stored copy would pin a day you never scrolled to the "now" of an earlier visit.
  - First visit to a day: today lands with now about ⅓ from the top; other days land at the top.
  - Tapping today's button while today is shown scrolls to now (`requestScrollToNow`), unless now is already settled in view; then it switches to the timeline (see [Tapping the shown day again](#tapping-the-shown-day-again)).
  - Tapping the now pill on any other screen goes to today at now; on My plan it goes to the pill's set on the timeline (see Top bar).
### Tapping the shown day again

Switches between My plan and the timeline, on the same day, the same way on both screens (`dayPickAction` in `DayButton.model.ts`, shared by both switchers). Back returns to the previous screen through the back history.

- **The shown day, not today:** switches screens.
- **Today's button, today shown:** scrolls to now while now is not settled in view; once it is, switches screens. So from anywhere on today, a first tap brings now into view and a second one switches.
- **Now is settled** (`nowSettled`) when now is drawn inside the **central 80 %** of the visible area (10 % in from each edge, along the time axis), or when a scroll to now would not move the view (it cannot get closer).
  - My plan: where the first now arrow is, on the list above the floating bottom bar (`planNowView`). With no arrow (before 08:00, an empty day, conflicts only with nothing live) a scroll to now goes to the top, so the list is settled at the top.
  - Timeline: where the now line is, across the horizontal scroll (`timelineNowView`). Before 08:30 and after 04:00 now is outside the scrollable window; the view is settled at the window's end nearest to it.
  - Asked only at the tap: each screen registers a probe under its screen key (`features/timeline/nowInView`), so scrolling re-renders nothing.
- **Where it goes** (`navigation/viewSwitch`):
  - From My plan: the timeline shown last, Program or Support Program; the Program until either has been shown (in memory only, so after a cold start it is the Program).
  - From a timeline: My plan.
  - The destination shows the same day and lands where it would for that day: its remembered scroll, else its own default (no scroll to now, no scroll to a set).
- No double-tap guard: two quick taps on another day pick it and then switch.

### Mounting a day

- **Switching days** mounts the new day the way the timeline does: once the screen's height is known, each day gets a list of its own that starts at its landing spot (saved position, else now, else the top) and draws about one screen of rows from there, the rest following one screenful per batch. Mounting the whole day at once, or its top first and then scrolling, made the switch visibly slow on phones. The very first list, before the screen is measured, starts from the top and is scrolled into place.

---

## Durations and wording

| Use | Format |
|---|---|
| Duration | `45 min`, `1 h 20`, `3 h`. Always `min`, never `m` |
| Time remaining (live, gap, pill, START) | prefixed with a real minus sign `−` (U+2212) |
| Spaces in the pill's times | narrow no-break spaces (U+202F): `−37 min`, `−1 h 30` |
| Times | `19:00–20:00` (en dash), tabular figures |

All My plan strings live in one module, so a later i18n pass is a drop-in. Current EN / CS pairs:

| Key | EN | CS |
|---|---|---|
| live | LIVE | HRAJE |
| done | done | odehráno |
| start | START | ZAČÍNÁ |
| conflict | Conflict | Konflikt |
| showMaybe | Show Maybe picks | Zobrazit výběry Možná |
| conflictsOnly | Show only conflicts | Zobrazit jen konflikty |
| empty | Nothing planned for this day | Na tento den nic v plánu |
| emptyConflicts | No conflicts on this day | V tento den žádné konflikty |
| filterMenu (a11y) | Filters | Filtry |

---

## Layout modes

- **Landscape (short layout):** no dedicated design.
  - **No now pill in landscape, on any screen**, because the top bar is hidden there, as today.
  - The existing floating bottom bar carries ☰, the day switcher and the screen's right-hand chip, as on the timeline. On My plan that's the filter chip; on other screens the lens chip is unchanged.
- **Wide (tablet, web):** same layout, with the content width capped at `MAX_CONTENT_WIDTH`.

## Navigation

- The drawer entry **"My plan"** replaces "Conflicts", at the top of the list.
  - It shows a **clash marker**: `⚠ 2`, a red warning triangle followed by the number of clashing Must-see sets (`useConflicts().count`). Red text with no badge background, shown only when the count is above 0.
    - The triangle says what's being counted, because a bare red number badge next to "My plan" would be ambiguous.
    - It's the same symbol as the `⚠ Conflict` group titles and the conflicts-only chip state.
    - A number *inside* a triangle was rejected as unreadable at badge size.
  - Nothing else: no status line, since the now pill already shows it on every screen.
- The Conflicts screen is removed. `ConflictContext` and `ConflictDetailSheet` stay.

## Colours

App tokens: `background #0a0a0a`, `surface #141414`, `surfaceRaised #1a1a1a`, `border #2a2a2a`, `borderMid #333`, `accent #e8c84a`, `danger #ff4444`, `dangerMuted #111111`, `textSecondary #ddd`, `textMuted #bbb`, `muted #7f7f7f`.

New values this screen introduces, to add as tokens:

| Use | Value |
|---|---|
| live progress, passed part (`livePassed`) | `#4a3f17` |
| break / future blue | `#5b9bff` |
| break progress, passed part (`breakPassed`) | `#1c2f52` |
| Maybe live progress, remaining part (`maybeText`) | `#8a8a8a` |
| row background and border | the set's category, as timeline blocks (`categoryBlockColors`) |

---

## Taps

| Element | Tap |
|---|---|
| Row (Must-see or Maybe), anywhere | The existing **artist detail sheet**. It already offers "stage/time → jump to the timeline slot" and the conflict warning line → conflict detail. |
| `⚠ Conflict` group title | The **conflict detail sheet** (`ConflictDetailSheet`) for that group, with a 44 pt tap area. It shows the whole group, and only it, on the timeline's own lanes, bands and support programme alike. |
| Clash bar (right edge) | Nothing separate: it's too thin, so a tap there counts as a row tap. |
| Gap | Nothing. |
| Long-press on a row | Nothing. Changing a pick inline would make the row vanish under your finger. |
| Now pill | On My plan: the pill's set on its timeline. Elsewhere: My plan, today, scrolled to now (see Top bar). |

---

## Later phases

- **Local reminders** (`expo-notifications`): "X starts in 10 min on Octagon". Offline, iOS and Android.
- **iOS home and lock-screen widget** (`expo-widgets`, SDK 56+): needs an App Group and a widget timeline precomputed from the static schedule, so it works fully offline.
- **Live Activity:** only if APNs push infrastructure ever exists.
- **Android widget:** optional.
