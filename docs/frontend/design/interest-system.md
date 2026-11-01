# Interest / Star System

Four states. Status values are the server's own (`InterestStatus` = `DbUserInterest['status']`),
with no conversion layer:

| State | Value | Icon | Label (EN) | Label (CZ) |
|---|---|---|---|---|
| Default | `none` | ☆ empty star, neutral | Not marked | Nemám zájem |
| Maybe | `maybe` | ⯪ half star, accent color | Maybe | Možná chci vidět |
| Must See | `will_go` | ★ full star, accent color | Must see! | Musím vidět! |
| Don't go | `dont_go` | ☆ empty star, red (`dontGo`), struck through | Don't go | — |

- Tap cycles state, one tap = one step: none → maybe → will_go → dont_go → none (`INTEREST_CYCLE`).
- `dont_go` records "I listened and decided not to go", so a band once checked is never re-checked
  by mistake (and it can be counted). After it, "status ≠ none" means "I have checked this band".
- `dont_go` shows **only on the StarButton** (artist row, artist detail). Everywhere else it is the
  same as `none`: `isInterested()` (features/interests/interestUtils) is the one definition of "is a pick", used by
  the "my picks" lens, `StarIndicator` (timeline, conflicts, sheets), the timeline block's star width,
  and friends' schedules.
- It is stored on the server like any decision (PUT; only `none` is a DELETE) and returned in share
  data, but a viewer never shows it: friends' statuses pass through `isSharedStatus()` (maybe/will_go
  only — unknown statuses are dropped, never defaulted to maybe), both when fetched and when loaded
  from the friends cache.
- The struck star is an Ionicons outline with a drawn bar (`StarGlyph`), not a second icon font —
  that would have to be preloaded behind the splash (styling/fonts).
- Visual state change is immediate. A star tap also opens the star selector beside the star (below).
- Visual distinction must be strong — color weight, not fill level alone. Color progression: neutral → amber/dim → bright accent.
- Half-star must render crisply at small sizes.

## Star selector

The star is both a rotator and an opener: a press turns the pick one step and opens the selector
beside the star (`features/interests/StarSelector`, its model `StarSelector.model.ts`, its state
`StarSelectorContext.tsx`). The star buttons in the artist row and the artist sheet are the only way
to set a pick.

- **Shape**: a fully rounded capsule (`toastSurface`, light border, `FLOATING_SHADOW`) left of the
  star and apart from it, centred on the star's measured frame (`measureInWindow`), not on the
  finger. It leaves the star and its whole reach (hit slop) uncovered, so another press lands on
  the star itself: it turns the pick again, and the same selector stays open and follows (no
  closing and reopening, so no blink).
- **States**: the four, in tap order (`INTEREST_CYCLE`), each drawn as the star draws it and at the
  star's own size (26 pt in the list, 32 pt in the sheet), in 44 pt (48 pt in the sheet) tap
  targets. The current one has a white ring; the others are dimmed to 50 % opacity, so the selector reads as
  the result with shortcuts, not as a question. A tap on a state sets it directly (`setStatus`),
  skipping the states between.
- **It says the press already did its job**: it opens at once (no grow), with the ring on the state
  before the press, and the ring moves to the new state straight away (100 ms); it moves the same
  way on every later change. This one motion runs even with the system's reduce-motion setting on
  (`ReduceMotion.Never`): it is what tells the transition. The name carries a green tick.
- **Room by the star**: 40 pt between the star and the nearest state's tap target; that nearest
  state is "Don't go", which a slip off the star must not hit.
- **Info text**: the current state's name and a tick in an inverted box (`infoSurface`, off-white,
  black text; a dark green tick, a dark red failure) above the states, so it never reads as list
  text on the dark screen, centred over
  them; on the top row, where there is no room under the top bar, below them. A failed save drops
  the tick and adds "⚠ not saved" as a row of its own in the box.
- **Closing**: 2.5 s after the last tap (`STAR_SELECTOR_TIMEOUT_MS`), never while a finger is on
  it, not at all after a failed save; at once on a touch anywhere off it and off its own star (and
  that star's reach), which still does what it does (AppShell sees every touch on its way down
  without claiming it: a tap on another star turns that one and moves the selector there); and when
  the artist list scrolls.
- **Nothing around it is dimmed**, in the list or in the artist sheet: dimming would make it read as
  a question that needs an answer (and it looked bad).
- **Fallback, if this still doesn't feel right on a device**: drop the selector for the plain toast
  that names the new state in text, and nothing more.

## The star's one table

Every place a pick is drawn — the star button, the indicator beside names, the star selector,
the lens chip — reads one table, `features/interests/StarButton.model.ts`: each status's icon, colour,
strike-through and label, and the star button's size and reach (`STAR_COLUMN_RESERVE`, which the
toast keeps clear of).
