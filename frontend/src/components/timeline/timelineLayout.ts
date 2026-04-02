import type { DbEvent } from '../../types/backend';

// ── Scale & geometry ──────────────────────────────────────────────────────────

export const PIXELS_PER_HOUR = 170;
export const PIXELS_PER_MS = PIXELS_PER_HOUR / (60 * 60 * 1000);

// Total canvas covers one full festival day (06:00 → next 06:00 = 24 h).
export const CANVAS_WIDTH     = PIXELS_PER_HOUR * 24; // 1920 px
export const DAY_DURATION_MS  = 24 * 60 * 60 * 1000;

// A festival "day" begins at 06:00, not midnight.
export const DAY_BOUNDARY_HOUR = 6;

// ── Visible scroll window ─────────────────────────────────────────────────────

// Scroll is limited to 09:30–04:00 (next day). Both expressed as hours after
// DAY_BOUNDARY_HOUR (06:00), so 3.5 h → 09:30, 22 h → 04:00 next day.
export const VIEW_START_H   = 3.5;   // hours after DAY_BOUNDARY_HOUR
export const VIEW_END_H     = 22;    // hours after DAY_BOUNDARY_HOUR
export const VIEW_OFFSET_X  = VIEW_START_H * PIXELS_PER_HOUR;
export const VIEW_WIDTH      = (VIEW_END_H - VIEW_START_H) * PIXELS_PER_HOUR;

// ── Row heights ───────────────────────────────────────────────────────────────

export const RULER_HEIGHT = 32;  // hour-label ruler at the top
export const STRIP_HEIGHT = 32;  // category title strip above each lane
export const LANE_HEIGHT  = 80;  // events row for each category
export const MIN_BLOCK_WIDTH = 4; // minimum rendered width for very short sets
export const NOW_ARROW_SIZE = 7;  // half-width and height of the now-line arrow
export const CONTENT_MAX_WIDTH = 700; // max width for centred bottom bar / UI content

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Map a Unix-ms timestamp to a canvas X coordinate for the given day. */
export function timeToX(timestampMs: number, dayStartMs: number): number {
  return Math.max(0, (timestampMs - dayStartMs) * PIXELS_PER_MS);
}

/**
 * Return the festival-day start (06:00 local) that contains the given timestamp.
 * Events before 06:00 belong to the previous calendar day.
 */
export function getFestivalDayStart(timestampMs: number): number {
  const date = new Date(timestampMs);
  if (date.getHours() < DAY_BOUNDARY_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  date.setHours(DAY_BOUNDARY_HOUR, 0, 0, 0);
  return date.getTime();
}

/** Collect unique festival-day starts (sorted asc) from a set of events. */
export function deriveFestivalDays(events: DbEvent[]): number[] {
  const daySet = new Set<number>();
  for (const event of events) {
    daySet.add(getFestivalDayStart(event.dateFrom));
  }
  return Array.from(daySet).sort((a, b) => a - b);
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Format a Unix-ms timestamp as HH:MM for display inside event blocks. */
export function formatTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDayLabel(dayStartMs: number): string {
  const date = new Date(dayStartMs);
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()}`;
}
