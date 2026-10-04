import {
  defaultScrollX,
  deriveFestivalDays,
  eventScrollTarget,
  getFestivalDayStart,
  labelRepeatPx,
  PIXELS_PER_HOUR,
  RULER_HEIGHT,
  timeToX,
  VIEW_OFFSET_X,
} from './timelineLayout';
import type { DbEvent } from '../../types/backend';

// ── Timeline geometry ─────────────────────────────────────────────────────────
//
// Everything here runs in Europe/Prague (tests/setup/globalTz.ts). Festival days
// start at 06:00 *local* time, so the zone is part of what is being tested.

const at = (iso: string): number => Date.parse(iso);
const WED = at('2025-08-06T06:00:00+02:00');
const THU = at('2025-08-07T06:00:00+02:00');
const HOUR = 60 * 60 * 1000;

const event = (dateFrom: number, dateTo = dateFrom + HOUR): DbEvent =>
  ({ dateFrom, dateTo } as unknown as DbEvent);

it('runs in the festival\'s time zone', () => {
  // If this fails, the global setup did not apply and every day boundary below
  // is being computed in the runner's own zone.
  expect(new Date(WED).getHours()).toBe(6);
});

describe('getFestivalDayStart', () => {
  it('starts a festival day at 06:00', () => {
    expect(getFestivalDayStart(at('2025-08-06T06:00:00+02:00'))).toBe(WED);
    expect(getFestivalDayStart(at('2025-08-06T23:59:00+02:00'))).toBe(WED);
  });

  it('counts a set after midnight as the previous day', () => {
    expect(getFestivalDayStart(at('2025-08-07T00:30:00+02:00'))).toBe(WED);
    expect(getFestivalDayStart(at('2025-08-07T05:59:00+02:00'))).toBe(WED);
  });
});

describe('deriveFestivalDays', () => {
  it('gives each festival day once, in order', () => {
    const days = deriveFestivalDays([
      event(at('2025-08-07T14:00:00+02:00')),
      event(at('2025-08-06T18:00:00+02:00')),
      event(at('2025-08-07T02:00:00+02:00')), // Wednesday night
      event(at('2025-08-06T20:00:00+02:00')),
    ]);
    expect(days).toEqual([WED, THU]);
  });
});

describe('timeToX', () => {
  it('maps time to pixels from the day start', () => {
    expect(timeToX(WED + 2 * HOUR, WED)).toBe(2 * PIXELS_PER_HOUR);
  });

  it('never goes left of the canvas', () => {
    expect(timeToX(WED - HOUR, WED)).toBe(0);
  });
});

describe('defaultScrollX', () => {
  it('opens at the window\'s left edge when the day has nothing on it', () => {
    expect(defaultScrollX(undefined, WED)).toBe(0);
  });

  it('puts the first event a quarter of an hour in from the left edge', () => {
    const first = at('2025-08-06T14:00:00+02:00');
    // 13:45 on a canvas whose window starts at 08:30.
    expect(defaultScrollX(first, WED)).toBe(timeToX(first - 15 * 60 * 1000, WED) - VIEW_OFFSET_X);
    expect(defaultScrollX(first, WED)).toBe(5.25 * PIXELS_PER_HOUR);
  });

  it('clamps an event before the window to its left edge', () => {
    expect(defaultScrollX(at('2025-08-06T08:00:00+02:00'), WED)).toBe(0);
  });
});

describe('labelRepeatPx', () => {
  it('falls back to the reference gap before the first layout', () => {
    expect(labelRepeatPx(0)).toBe(2.5 * PIXELS_PER_HOUR);
  });

  it('reproduces the reference gap on the reference width', () => {
    expect(labelRepeatPx(402)).toBe(2.5 * PIXELS_PER_HOUR);
  });

  it('moves in half-hour steps, so a resize crosses only a few thresholds', () => {
    for (const width of [300, 420, 600, 804, 1200]) {
      expect(labelRepeatPx(width) % (0.5 * PIXELS_PER_HOUR)).toBe(0);
    }
    expect(labelRepeatPx(420)).toBe(labelRepeatPx(402));
  });

  it('never repeats more often than once an hour', () => {
    expect(labelRepeatPx(50)).toBe(PIXELS_PER_HOUR);
  });
});

describe('eventScrollTarget', () => {
  const base = {
    dayStartMs: WED,
    viewportWidth: 400,
    lane: undefined,
    areaHeight: 700,
    bottomClearance: 0,
  };

  it('centres a short event\'s midpoint in the viewport', () => {
    const fromMs = at('2025-08-06T20:00:00+02:00');
    const toMs = fromMs + HOUR;
    const { x } = eventScrollTarget({ ...base, fromMs, toMs });
    const midpointOnScreen = timeToX((fromMs + toMs) / 2, WED) - VIEW_OFFSET_X - x;
    expect(midpointOnScreen).toBeCloseTo(200);
  });

  it('keeps a long event\'s start on screen with a quarter of an hour before it', () => {
    const fromMs = at('2025-08-06T12:00:00+02:00');
    const toMs = fromMs + 8 * HOUR;
    const { x } = eventScrollTarget({ ...base, fromMs, toMs });
    const startOnScreen = timeToX(fromMs, WED) - VIEW_OFFSET_X - x;
    expect(startOnScreen).toBeCloseTo(0.25 * PIXELS_PER_HOUR);
  });

  it('never scrolls left of the window', () => {
    const fromMs = at('2025-08-06T08:45:00+02:00');
    expect(eventScrollTarget({ ...base, fromMs, toMs: fromMs + HOUR }).x).toBe(0);
  });

  it('leaves the vertical offset alone without a lane', () => {
    const fromMs = at('2025-08-06T20:00:00+02:00');
    expect(eventScrollTarget({ ...base, fromMs, toMs: fromMs + HOUR }).y).toBeUndefined();
  });

  it('centres the lane in the height between the ruler and the bottom bar', () => {
    const fromMs = at('2025-08-06T20:00:00+02:00');
    const lane = { top: 1000, span: 102 };
    const plain = eventScrollTarget({ ...base, fromMs, toMs: fromMs + HOUR, lane });
    const covered = eventScrollTarget({ ...base, fromMs, toMs: fromMs + HOUR, lane, bottomClearance: 76 });

    expect(plain.visibleHeight).toBe(700 - RULER_HEIGHT);
    expect(plain.y! + plain.visibleHeight / 2).toBe(lane.top + lane.span / 2);
    // A floating bottom bar shrinks the visible height, so the lane must sit
    // higher in the content — further down the scroll — to stay centred above it.
    expect(covered.visibleHeight).toBe(700 - RULER_HEIGHT - 76);
    expect(covered.y! + covered.visibleHeight / 2).toBe(lane.top + lane.span / 2);
  });

  it('does not scroll above the top for the first lane', () => {
    const fromMs = at('2025-08-06T20:00:00+02:00');
    const { y } = eventScrollTarget({ ...base, fromMs, toMs: fromMs + HOUR, lane: { top: 0, span: 102 } });
    expect(y).toBe(0);
  });
});
