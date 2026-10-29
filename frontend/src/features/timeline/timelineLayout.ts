import type { DbEvent } from '../../types/backend';
import { DAY_DURATION_MS } from '../../utils/festivalTime';
import type { NowView } from './DayButton.model';

// ── Scale & geometry ──────────────────────────────────────────────────────────

export const PIXELS_PER_HOUR = 170;
export const PIXELS_PER_MS = PIXELS_PER_HOUR / (60 * 60 * 1000);

// Total canvas covers one full festival day (06:00 → next 06:00 = 24 h).
export const CANVAS_WIDTH     = PIXELS_PER_HOUR * 24; // 1920 px

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
export const LANE_HEIGHT  = 70;  // events row for each category

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

// Event-block title size at full scale; narrow blocks step down once by
// TEXT_SHRINK_SCALE — see utils/textFit.
export const BLOCK_FONT_SIZE = 12;

// ── Repeated labels on long blocks ────────────────────────────────────────────

// A long set can span more than the viewport, leaving a wide colour box whose
// title has scrolled off to the left. Rather than sticking the title to the
// viewport's edge — which would mean animating against the scroll offset, and
// so jittering (see docs/frontend/design/timeline-rendering.md) — the title is simply repeated along the block.
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

// ── Conflict sheet ────────────────────────────────────────────────────────────

const CONFLICT_MARGIN_MS = 30 * 60 * 1000;

/**
 * The time range the conflict sheet shows for a group of sets: their span with
 * exactly half an hour either side, widened evenly to at least `minWidthPx` (the
 * sheet's width) so the sets stay centred and the ruler runs edge to edge. It
 * never leaves the festival day the group is on; at a day edge it slides back in
 * rather than shrinking.
 */
export function conflictWindow(events: DbEvent[], dayStartMs: number, minWidthPx: number): { from: number; to: number } {
  let from = Math.min(...events.map((e) => e.dateFrom)) - CONFLICT_MARGIN_MS;
  let to = Math.max(...events.map((e) => e.dateTo)) + CONFLICT_MARGIN_MS;
  const extra = minWidthPx / PIXELS_PER_MS - (to - from);
  if (extra > 0) {
    from -= extra / 2;
    to += extra / 2;
  }
  const dayEndMs = dayStartMs + DAY_DURATION_MS;
  if (from < dayStartMs) {
    to = Math.min(dayEndMs, to + (dayStartMs - from));
    from = dayStartMs;
  }
  if (to > dayEndMs) {
    from = Math.max(dayStartMs, from - (to - dayEndMs));
    to = dayEndMs;
  }
  return { from, to };
}

// ── Sub-rows ──────────────────────────────────────────────────────────────────

export type SubRowLayout = {
  subRowCount: number;
  eventSubRows: Record<string, number>; // eventId → 0-based sub-row index
};

/**
 * Stacks one lane's sets so none overlap: greedy interval scheduling, by start
 * time, each set in the first sub-row whose last set has ended.
 */
export function assignSubRows(events: DbEvent[]): SubRowLayout {
  const sorted = [...events].sort((a, b) => a.dateFrom - b.dateFrom);
  const subRowEndTimes: number[] = [];
  const eventSubRows: Record<string, number> = {};
  for (const event of sorted) {
    let row = subRowEndTimes.findIndex((end) => end <= event.dateFrom);
    if (row === -1) {
      row = subRowEndTimes.length;
      subRowEndTimes.push(event.dateTo);
    } else {
      subRowEndTimes[row] = event.dateTo;
    }
    eventSubRows[event.eventId] = row;
  }
  return { subRowCount: Math.max(1, subRowEndTimes.length), eventSubRows };
}

// How much empty time to leave to the left of the day's first event when the
// timeline opens on a day the user has never scrolled.
export const TIMELINE_PRE_ROLL_MS = 15 * 60 * 1000;

/**
 * Content-space X that puts the day's first event `TIMELINE_PRE_ROLL_MS` in from
 * the left edge — the position a day opens at when nothing was persisted for it.
 *
 * Derived where it is read rather than precomputed into storage: a precomputed
 * default has to win a race against the view that consumes it, and loses (see
 * docs/frontend/design/timeline-rendering.md). Returns 0 — i.e. the window's left edge, 08:30 — when the day has
 * no events to aim at.
 *
 * The 06:00 day boundary needs no special handling here: `dayStartMs` is already
 * the 06:00 start and `timeToX` is relative to it, so an early first event
 * clamps to the left edge on its own.
 */
export function defaultScrollX(firstEventMs: number | undefined, dayStartMs: number): number {
  if (firstEventMs === undefined) {
    return 0;
  }
  return Math.max(0, timeToX(firstEventMs - TIMELINE_PRE_ROLL_MS, dayStartMs) - VIEW_OFFSET_X);
}

// ── Scroll to an event ────────────────────────────────────────────────────────

// Horizontal space kept to the left of an event's start when scrolling to it.
const EVENT_LEFT_PADDING_X = 15 * 60 * 1000 * PIXELS_PER_MS; // 15 minutes

export type EventScrollInput = {
  fromMs: number;
  toMs: number;
  dayStartMs: number;
  /** Measured width of the horizontal scroller. */
  viewportWidth: number;
  /** The event's lane, from the top of the lane stack; undefined leaves the vertical offset alone. */
  lane: { top: number; span: number } | undefined;
  /** Measured height of the whole timeline area, ruler included. */
  areaHeight: number;
  /** Space at the bottom covered by the floating BottomBar. */
  bottomClearance: number;
};

export type EventScrollTarget = {
  /** Content-space X for the horizontal scroller. */
  x: number;
  /** Y for the vertical scroller; undefined when there is no lane to centre. */
  y: number | undefined;
  /** Height of the lane stack actually visible — between the ruler and the BottomBar. */
  visibleHeight: number;
};

/**
 * Where to scroll so an event is in view: its midpoint centred horizontally, but
 * never so far that its start loses its left padding (a long event), and its lane
 * centred in the height that is actually visible — the ruler sits above the
 * vertical scroller, and on a short viewport the floating BottomBar covers the
 * bottom of it, so centring on the raw height would park the lane behind the bar.
 */
export function eventScrollTarget(input: EventScrollInput): EventScrollTarget {
  const { fromMs, toMs, dayStartMs, viewportWidth, lane, areaHeight, bottomClearance } = input;
  // Content-space X: the canvas is shifted left by VIEW_OFFSET_X.
  const centreX = timeToX((fromMs + toMs) / 2, dayStartMs) - VIEW_OFFSET_X;
  const startX  = timeToX(fromMs, dayStartMs) - VIEW_OFFSET_X;
  const centredOffset = centreX - viewportWidth / 2;
  const x = Math.max(0, Math.min(centredOffset, startX - EVENT_LEFT_PADDING_X));

  const visibleHeight = Math.max(0, areaHeight - RULER_HEIGHT - bottomClearance);
  const y = lane === undefined ? undefined : Math.max(0, lane.top + lane.span / 2 - visibleHeight / 2);
  return { x, y, visibleHeight };
}

// ── Where now is on the scrolled timeline ─────────────────────────────────────

/**
 * Now on a day's timeline scrolled to `scrollX` in a viewport `viewportWidth`
 * wide, in content x: where the now line is, and where a scroll to now goes
 * (centred, as eventScrollTarget puts it), held within the scrollable window.
 * Today's day button reads it (DayButton.model's nowSettled).
 */
export function timelineNowView(nowMs: number, dayStartMs: number, scrollX: number, viewportWidth: number): NowView {
  const { x } = eventScrollTarget({
    fromMs: nowMs, toMs: nowMs, dayStartMs, viewportWidth, lane: undefined, areaHeight: 0, bottomClearance: 0,
  });
  const maxScroll = Math.max(0, VIEW_WIDTH - viewportWidth);
  return {
    now: timeToX(nowMs, dayStartMs) - VIEW_OFFSET_X,
    scroll: scrollX,
    size: viewportWidth,
    nowScroll: Math.min(x, maxScroll),
  };
}
