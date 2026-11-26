import { assignSubRows, centreTimeAt, conflictWindow, defaultScrollX, eventScrollTarget, labelRepeatPx, PIXELS_PER_HOUR, RULER_HEIGHT, scrollXCentredOn, timeToX, VIEW_OFFSET_X } from './timelineLayout';
import type { DbEvent } from '../../types/backend';

// ── Timeline geometry ─────────────────────────────────────────────────────────
//
// Festival days start at 06:00 festival time (Europe/Prague), whatever zone the
// device is in. The suite runs in New York (tests/setup/globalTz.ts), where
// reading the device's clock instead would put every boundary and label below
// six hours off.

const at = (iso: string): number => Date.parse(iso);
const WED = at('2025-08-06T06:00:00+02:00');
const THU = at('2025-08-07T06:00:00+02:00');
const HOUR = 60 * 60 * 1000;

const event = (dateFrom: number, dateTo = dateFrom + HOUR): DbEvent =>
  ({ dateFrom, dateTo } as unknown as DbEvent);

describe('conflictWindow', () => {
  const t = (hm: string, day = '06'): number => at(`2025-08-${day}T${hm}:00+02:00`);

  it('spans the sets with exactly half an hour either side', () => {
    const range = conflictWindow([event(t('14:29'), t('15:00')), event(t('14:50'), t('15:31'))], WED, 0);
    expect(range).toEqual({ from: t('13:59'), to: t('16:01') });
  });

  it('widens evenly to a minimum width, keeping the sets centred', () => {
    // 340 px is two hours; the sets with their margins take 100 min.
    expect(2 * PIXELS_PER_HOUR).toBe(340);
    const range = conflictWindow([event(t('14:00'), t('14:40'))], WED, 340);
    expect(range).toEqual({ from: t('13:20'), to: t('15:20') });
  });

  it('slides back inside the festival day rather than shrinking', () => {
    const range = conflictWindow([event(t('06:10'), t('06:30'))], WED, 340);
    expect(range).toEqual({ from: WED, to: t('08:00') });
  });

  it('never leaves the festival day', () => {
    const range = conflictWindow([event(t('06:10')), event(t('05:00', '07'), t('05:50', '07'))], WED, 0);
    expect(range).toEqual({ from: WED, to: THU });
  });
});

describe('assignSubRows', () => {
  it('puts each set in the first row free by its start', () => {
    const a = { ...event(WED + HOUR, WED + 2 * HOUR), eventId: 'a' };
    const b = { ...event(WED + 1.5 * HOUR, WED + 2.5 * HOUR), eventId: 'b' };
    const c = { ...event(WED + 2 * HOUR, WED + 3 * HOUR), eventId: 'c' };
    expect(assignSubRows([c, b, a])).toEqual({ subRowCount: 2, eventSubRows: { a: 0, b: 1, c: 0 } });
  });

  it('has one row when empty', () => {
    expect(assignSubRows([])).toEqual({ subRowCount: 1, eventSubRows: {} });
  });
});

it('runs away from the festival\'s time zone', () => {
  // If this fails, the global setup did not apply, and the cases below could
  // not tell festival time from the device's.
  expect(new Date(WED).getHours()).not.toBe(6);
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

// The time at the timeline's centre, and the scroll that centres a time: what
// My plan keeps while the phone turns. The view window runs 08:30 to 04:00
// (19.5 h, 3315 px at 170 px an hour); a 340 px view shows two hours.
describe('centreTimeAt', () => {
  it('reads the window\'s start plus half the view at scroll 0', () => {
    // 08:30 + 1 h.
    expect(centreTimeAt(0, 340, WED)).toBe(at('2025-08-06T09:30:00+02:00'));
  });

  it('moves an hour per 170 px scrolled', () => {
    // 850 px is 5 h: 09:30 + 5 h.
    expect(centreTimeAt(850, 340, WED)).toBe(at('2025-08-06T14:30:00+02:00'));
  });

  it('reads further right on a wider view scrolled the same', () => {
    // 1020 px wide: 08:30 + 5 h + 3 h. The width the centre is read with is
    // what tells a turned phone's insets apart.
    expect(centreTimeAt(850, 1020, WED)).toBe(at('2025-08-06T16:30:00+02:00'));
  });
});

describe('scrollXCentredOn', () => {
  it('centres a time in the view', () => {
    // 14:30 is 6 h into the window (1020 px), less half the view (170).
    expect(scrollXCentredOn(at('2025-08-06T14:30:00+02:00'), WED, 340)).toBe(850);
  });

  it('centres the same time further left on a wider view', () => {
    // 1020 − 510.
    expect(scrollXCentredOn(at('2025-08-06T14:30:00+02:00'), WED, 1020)).toBe(510);
  });

  it('holds a time near the window\'s start at its left edge', () => {
    // 09:00: 85 px into the window, less 170.
    expect(scrollXCentredOn(at('2025-08-06T09:00:00+02:00'), WED, 340)).toBe(0);
  });

  it('holds a time near the window\'s end at its right edge', () => {
    // 04:00 next morning: 3315 px into the window, less 170; held at 3315 − 340.
    expect(scrollXCentredOn(at('2025-08-07T04:00:00+02:00'), WED, 340)).toBe(2975);
  });

  it('reads back the time it centred', () => {
    const time = at('2025-08-06T20:07:30+02:00');
    expect(centreTimeAt(scrollXCentredOn(time, WED, 734), 734, WED)).toBe(time);
  });
});
