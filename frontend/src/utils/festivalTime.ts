// ── Festival time ─────────────────────────────────────────────────────────────
//
// Every time the app shows — set times, day labels, the 06:00 festival-day
// boundary — is the festival's own wall clock, Europe/Prague, whatever zone the
// device is in. Someone planning from London or New York sees the same timeline
// as someone on site; reading the device's zone instead shifted the day boundary
// and clipped dozens of sets out of the visible window.
//
// Computed, not looked up through Intl: these run per event and per block
// render, and Intl is the slow path on Hermes. The offset follows the EU rule —
// CEST (UTC+2) from 01:00 UTC on the last Sunday of March to 01:00 UTC on the
// last Sunday of October, CET (UTC+1) otherwise. festivalTime.test.ts checks it
// against the ICU time-zone database over a decade of instants; should the EU
// ever stop changing clocks, that test is what fails.

export const FESTIVAL_TIME_ZONE = 'Europe/Prague';

const HOUR_MS = 60 * 60 * 1000;

/** 01:00 UTC on the last Sunday of the given month — when EU clocks change. */
function lastSundayChangeUtc(year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const lastSunday = lastDay.getUTCDate() - lastDay.getUTCDay();
  return Date.UTC(year, monthIndex, lastSunday, 1);
}

/** Europe/Prague's offset from UTC at the given instant. */
export function festivalUtcOffsetMs(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  const summer = utcMs >= lastSundayChangeUtc(year, 2) && utcMs < lastSundayChangeUtc(year, 9);
  if (summer) {
    return 2 * HOUR_MS;
  }
  return HOUR_MS;
}

/**
 * The festival's wall clock at an instant, as a Date whose **UTC** fields read
 * as Prague's local ones: `toFestivalClock(t).getUTCHours()` is the hour in
 * Prague. Never read its local-time fields, which would apply the device's zone
 * on top.
 */
export function toFestivalClock(utcMs: number): Date {
  return new Date(utcMs + festivalUtcOffsetMs(utcMs));
}

/**
 * The instant at which Prague's wall clock shows the given time — the inverse of
 * toFestivalClock, for a wall-clock value built with the UTC setters.
 */
export function fromFestivalClock(wallMs: number): number {
  // The offset depends on the instant being solved for; one refinement settles
  // it everywhere except inside the hour the clocks skip or repeat (02:00–03:00
  // local), where no festival time is ever built.
  const guess = wallMs - festivalUtcOffsetMs(wallMs);
  return wallMs - festivalUtcOffsetMs(guess);
}
