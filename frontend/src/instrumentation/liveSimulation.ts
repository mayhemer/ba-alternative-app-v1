import { fromFestivalClock, toFestivalClock } from '../utils/festivalTime';

// ── Live simulation: every real week plays as the festival week ──────────────
//
// The `live-simulation` time mode (timeMode.ts), for the development and
// preview builds: the app shows the same weekday and the same wall-clock time
// (festival time, Prague) in the calendar week, Monday to Sunday, that holds
// the edition's first festival day. Real Wednesday 14:10 → the festival week's
// Wednesday 14:10; next Monday it starts over. So the app can be used "live"
// on any week of the year, at the hours a festival-goer would use it.
//
// The week is the calendar's: a day's small hours stay on their calendar day,
// though the festival counts them to the day before (utils/festivalTime).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Wall-clock ms (in UTC fields) of 00:00 on the Monday of the calendar week holding `wall`. */
function mondayOf(wall: Date): number {
  const sinceMonday = (wall.getUTCDay() + 6) % 7;
  return Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - sinceMonday * DAY_MS;
}

/** `realMs` moved into the festival week of `firstFestivalDayMs`, keeping its weekday and wall-clock time. */
export function festivalWeekTime(realMs: number, firstFestivalDayMs: number): number {
  const wall = toFestivalClock(realMs);
  const intoWeek = wall.getTime() - mondayOf(wall);
  return fromFestivalClock(mondayOf(toFestivalClock(firstFestivalDayMs)) + intoWeek);
}
