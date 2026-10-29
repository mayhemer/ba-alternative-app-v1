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

import type { DbEvent } from '../types/backend';

export const FESTIVAL_TIME_ZONE = 'Europe/Prague';

const HOUR_MS = 60 * 60 * 1000;

/** 01:00 UTC on the last Sunday of the given month — when EU clocks change. */
function lastSundayChangeUtc(year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const lastSunday = lastDay.getUTCDate() - lastDay.getUTCDay();
  return Date.UTC(year, monthIndex, lastSunday, 1);
}

/** One UTC year and its summer-time span, both as [from, to) instants. */
type YearRule = { from: number; to: number; summerFrom: number; summerTo: number };

function yearRule(year: number): YearRule {
  return {
    from: Date.UTC(year, 0, 1),
    to: Date.UTC(year + 1, 0, 1),
    summerFrom: lastSundayChangeUtc(year, 2),
    summerTo: lastSundayChangeUtc(year, 9),
  };
}

// The year last asked about. Conversions run per event and per render, nearly
// all within one festival year, so most calls answer from it without building a
// single Date; recomputing the two clock changes every time was a hot spot.
let cachedYear: YearRule = yearRule(2025);

/** Europe/Prague's offset from UTC at the given instant. */
export function festivalUtcOffsetMs(utcMs: number): number {
  if (utcMs < cachedYear.from || utcMs >= cachedYear.to) {
    cachedYear = yearRule(new Date(utcMs).getUTCFullYear());
  }
  const summer = utcMs >= cachedYear.summerFrom && utcMs < cachedYear.summerTo;
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

// ── Festival days ─────────────────────────────────────────────────────────────

export const DAY_DURATION_MS  = 24 * 60 * 60 * 1000;

// A festival "day" begins at 06:00, not midnight.
export const DAY_BOUNDARY_HOUR = 6;

/**
 * Return the festival-day start (06:00 festival time, Europe/Prague) that
 * contains the given timestamp. Events before 06:00 belong to the previous
 * calendar day. Independent of the device's time zone (see above).
 */
export function getFestivalDayStart(timestampMs: number): number {
  const wall = toFestivalClock(timestampMs);
  if (wall.getUTCHours() < DAY_BOUNDARY_HOUR) {
    wall.setUTCDate(wall.getUTCDate() - 1);
  }
  wall.setUTCHours(DAY_BOUNDARY_HOUR, 0, 0, 0);
  return fromFestivalClock(wall.getTime());
}

/** Collect unique festival-day starts (sorted asc) from a set of events. */
export function deriveFestivalDays(events: DbEvent[]): number[] {
  const daySet = new Set<number>();
  for (const event of events) {
    daySet.add(getFestivalDayStart(event.dateFrom));
  }
  return Array.from(daySet).sort((a, b) => a - b);
}

/**
 * The festival day that holds `now` — a day runs from its 06:00 to the next —
 * or null outside the festival. The one rule for "today" in both switchers and
 * in My plan's list.
 */
export function festivalToday(festivalDays: readonly number[], now: number): number | null {
  const day = getFestivalDayStart(now);
  return festivalDays.includes(day) ? day : null;
}

// ── Display helpers ───────────────────────────────────────────────────────────

// All in festival time (Europe/Prague), read through toFestivalClock's UTC
// fields — never the device's zone.

/** Format a Unix-ms timestamp as HH:MM for display inside event blocks. */
export function formatTime(timestampMs: number): string {
  const wall = toFestivalClock(timestampMs);
  return `${String(wall.getUTCHours()).padStart(2, '0')}:${String(wall.getUTCMinutes()).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short weekday of a timestamp, e.g. "Wed". */
export function formatWeekday(timestampMs: number): string {
  return WEEKDAY_NAMES[toFestivalClock(timestampMs).getUTCDay()];
}

/** Day and month of a timestamp, e.g. "6.8.". */
export function formatDayMonth(timestampMs: number): string {
  const wall = toFestivalClock(timestampMs);
  return `${wall.getUTCDate()}.${wall.getUTCMonth() + 1}.`;
}

export function formatDayLabel(dayStartMs: number): string {
  return `${formatWeekday(dayStartMs)} ${toFestivalClock(dayStartMs).getUTCDate()}`;
}
