# Interest / Star System

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
  same as `none`: `isInterested()` (features/interests/interestUtils) is the one definition of "is a pick", used by
  the "my picks" lens, `StarIndicator` (timeline, conflicts, sheets), the timeline block's star width,
  and friends' schedules.
- It is stored on the server like any decision (PUT; only `none` is a DELETE) and returned in share
  data, but a viewer never shows it: friends' statuses pass through `isSharedStatus()` (maybe/will_go
  only — unknown statuses are dropped, never defaulted to maybe), both when fetched and when loaded
  from the friends cache.
- The struck star is an Ionicons outline with a drawn bar (`StarGlyph`), not a second icon font —
  that would have to be preloaded behind the splash (styling/fonts).
- Visual state change is immediate. A star tap shows the cycle-strip toast (see Feedback Zone in [navigation.md](navigation.md)).
- Visual distinction must be strong — color weight, not fill level alone. Color progression: neutral → amber/dim → bright accent.
- Half-star must render crisply at small sizes.

## The star's one table

Every place a pick is drawn — the star button, the indicator beside names, the toast's cycle strip,
the lens chip — reads one table, `features/interests/StarButton.model.ts`: each status's icon, colour,
strike-through and label, and the star button's size and reach (`STAR_COLUMN_RESERVE`, which the
toast keeps clear of). The toast's strip has its own model (`InterestCycleStrip.model.ts`).
