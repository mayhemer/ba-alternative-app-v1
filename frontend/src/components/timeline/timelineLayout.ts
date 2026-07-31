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

// Scroll is limited to 08:30–04:00 (next day). Both expressed as hours after
// DAY_BOUNDARY_HOUR (06:00), so 2.5 h → 08:30, 22 h → 04:00 next day.
export const VIEW_START_H   = 2.5;   // hours after DAY_BOUNDARY_HOUR
export const VIEW_END_H     = 22;    // hours after DAY_BOUNDARY_HOUR
export const VIEW_OFFSET_X  = VIEW_START_H * PIXELS_PER_HOUR;
export const VIEW_WIDTH      = (VIEW_END_H - VIEW_START_H) * PIXELS_PER_HOUR;

// ── Row heights ───────────────────────────────────────────────────────────────

export const RULER_HEIGHT = 32;  // hour-label ruler at the top
export const STRIP_HEIGHT = 32;  // category title strip above each lane
export const LANE_HEIGHT  = 80;  // events row for each category

// Separator drawn at the bottom of every lane. RN's box model is border-box, so
// this eats into LANE_HEIGHT rather than adding to it — which is why a block that
// fills its sub-row is LANE_HEIGHT - LANE_BORDER_WIDTH tall (see ArtistBlock).
export const LANE_BORDER_WIDTH = 2;

/**
 * Height reserved above a lane for its title strip. Zero on a short viewport: the
 * title is drawn over the lane there instead (see LaneLabelOverlay), because a
 * landscape phone shows ~2.5 lanes and a 32 pt strip each is a third of them.
 *
 * The lane stack's geometry is accumulated in two places that must agree —
 * useTimelineData (laneOffsets, canvasHeight) and CategoryLane's flow layout — so
 * both derive the strip height from here rather than branching on their own.
 */
export function stripHeightFor(overlayTitles: boolean): number {
  return overlayTitles ? 0 : STRIP_HEIGHT;
}
export const MIN_BLOCK_WIDTH = 4; // minimum rendered width for very short sets
export const NOW_LINE_ARROW_SIZE = 7;  // half-width and height of the now-line arrow
export const NOW_BUTTON_ARROW_SIZE = 7;  // half-width and height of the now-line arrow on the day button
export const CONTENT_MAX_WIDTH = 700; // max width for centred bottom bar / UI content

// Event-block title size at full scale; narrow blocks step down once by
// TEXT_SHRINK_SCALE — see utils/textFit.
export const BLOCK_FONT_SIZE = 12;

// ── Repeated labels on long blocks ────────────────────────────────────────────

// A long set can span more than the viewport, leaving a wide colour box whose
// title has scrolled off to the left. Rather than sticking the title to the
// viewport's edge — which would mean animating against the scroll offset, and
// so jittering (see DESIGN.md) — the title is simply repeated along the block.
//
// The gap scales with the viewport rather than being fixed, because no single
// interval suits both orientations: one dense enough for portrait litters a
// landscape screen, and one sparse enough for landscape leaves portrait with
// bare stretches. Scaling makes repeats appear only when a block is genuinely
// wider than the screen, and vanish on viewports that can show it whole.
//
// Calibrated so the ratio reproduces the gap that reads well on the reference
// device; it works out a little over one screenful.
const LABEL_REPEAT_REFERENCE_WIDTH = 402;              // iPhone 17 Pro, portrait
const LABEL_REPEAT_REFERENCE_PX = 2.5 * PIXELS_PER_HOUR;
const LABEL_REPEAT_RATIO = LABEL_REPEAT_REFERENCE_PX / LABEL_REPEAT_REFERENCE_WIDTH;

// Quantised to half-hours so that dragging a window edge on web crosses a
// handful of thresholds rather than changing the value every pixel — each change
// re-renders every block on screen. The reference gap is a whole number of steps,
// so quantising leaves the calibration exact.
const LABEL_REPEAT_STEP_PX = 0.5 * PIXELS_PER_HOUR;
const LABEL_REPEAT_MIN_PX = PIXELS_PER_HOUR;

/**
 * Gap between repeated copies of a block's label, for a given timeline viewport
 * width. Pass the *measured* width of the scroller, not the window: the two
 * differ whenever the permanent drawer or a safe-area inset takes space.
 */
export function labelRepeatPx(viewportWidth: number): number {
  // Before the first onLayout there is nothing to scale from; fall back to the
  // reference rather than flashing a burst of very dense labels.
  if (viewportWidth <= 0) {
    return LABEL_REPEAT_REFERENCE_PX;
  }
  const stepped =
    Math.round((viewportWidth * LABEL_REPEAT_RATIO) / LABEL_REPEAT_STEP_PX) * LABEL_REPEAT_STEP_PX;
  return Math.max(LABEL_REPEAT_MIN_PX, stepped);
}

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
