import { getFestivalDays } from '../cache/cacheService';
import { setClockShift } from './clock';
import { fromFestivalClock, toFestivalClock } from './festivalTime';

// ── LIVE SIMULATION (testing branch only, never for production) ───────────────
//
// Every real week plays as the selected edition's festival week: the same
// weekday and wall-clock time (Prague), in the week (Monday–Sunday) that holds
// the edition's first festival day. Real Monday 14:08 → the festival week's
// Monday 14:08, and so on; next Monday it starts over.
//
// Shifts everything that reads currentTimeMs(); stored timestamps (pick
// updatedAt, token expiry) use realTimeMs() and stay real. An edition with no
// days in the cache yet runs on the real clock.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Wall-clock (UTC-field) ms of 00:00 on the Monday of the week holding `wall`. */
function mondayOf(wall: Date): number {
  const sinceMonday = (wall.getUTCDay() + 6) % 7;
  return Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - sinceMonday * DAY_MS;
}

let simulatedSlug: string | null = null;

/** Called with the selected edition on every AppProvider render; cheap and idempotent. */
export function simulateFestivalWeekOf(slug: string | null): void {
  if (slug === simulatedSlug) {
    return;
  }
  simulatedSlug = slug;
  setClockShift(slug === null ? null : (realMs) => {
    const days = getFestivalDays(slug);
    if (days.length === 0) {
      return realMs;
    }
    const wall = toFestivalClock(realMs);
    const festivalWall = wall.getTime() - mondayOf(wall) + mondayOf(toFestivalClock(days[0]));
    return fromFestivalClock(festivalWall);
  });
}
