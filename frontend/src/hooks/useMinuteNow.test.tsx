import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useFestivalDayStart, useMinuteNow } from './useMinuteNow';
import { setCurrentTimeMs } from '../utils/clock';

// ── The plan's shared minute clock ────────────────────────────────────────────
//
// Everything time-based on the plan (pill, live rows, the current gap) reads
// "now" through this hook, so it ticks once a minute, on the minute, and catches
// up at once when the app comes back to the foreground — timers stall while the
// phone is locked, and a stale "−37 min" is exactly what the screen must not show.

const T = Date.parse('2025-08-07T19:23:30+02:00');
const minute = (hm: string): number => Date.parse(`2025-08-07T${hm}:00+02:00`);

let appStateHandler: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers();
  setCurrentTimeMs(T);
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  setCurrentTimeMs(null);
  jest.restoreAllMocks();
});

it('reports the current minute', async () => {
  const { result } = await renderHook(() => useMinuteNow());
  expect(result.current).toBe(minute('19:23'));
});

it('moves on at the next minute boundary, not a minute after mounting', async () => {
  const { result } = await renderHook(() => useMinuteNow());

  setCurrentTimeMs(T + 29_000);
  await act(async () => { jest.advanceTimersByTime(29_000); });
  expect(result.current).toBe(minute('19:23'));

  setCurrentTimeMs(T + 30_000);
  await act(async () => { jest.advanceTimersByTime(1_000); });
  expect(result.current).toBe(minute('19:24'));

  setCurrentTimeMs(T + 90_000);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(result.current).toBe(minute('19:25'));
});

it('catches up at once when the app returns to the foreground', async () => {
  const { result } = await renderHook(() => useMinuteNow());

  // Locked phone: no timer ran for 17 minutes.
  setCurrentTimeMs(T + 17 * 60_000);
  await act(async () => { appStateHandler?.('active'); });
  expect(result.current).toBe(minute('19:40'));
});

// ── The same clock, at day resolution ─────────────────────────────────────────
//
// For what changes only with the festival day (06:00 to 06:00): the day
// switchers. Dimensions: a festival day; the minute before 06:00 and 06:00
// itself; a date outside the festival, which has no festival-day list here.

describe('useFestivalDayStart', () => {
  it('is the 06:00 that started the festival day holding now', async () => {
    const { result } = await renderHook(() => useFestivalDayStart());
    expect(result.current).toBe(minute('06:00'));
  });

  it('is still the day before at 05:59', async () => {
    setCurrentTimeMs(Date.parse('2025-08-08T05:59:00+02:00'));
    const { result } = await renderHook(() => useFestivalDayStart());
    expect(result.current).toBe(minute('06:00'));
  });

  it('is a day outside the festival too', async () => {
    setCurrentTimeMs(Date.parse('2025-08-01T12:00:00+02:00'));
    const { result } = await renderHook(() => useFestivalDayStart());
    expect(result.current).toBe(Date.parse('2025-08-01T06:00:00+02:00'));
  });

  it('renders again only when 06:00 starts the next day, not on every minute', async () => {
    setCurrentTimeMs(Date.parse('2025-08-08T05:58:30+02:00'));
    let renders = 0;
    const { result } = await renderHook(() => { renders += 1; return useFestivalDayStart(); });
    const mounted = renders;

    setCurrentTimeMs(Date.parse('2025-08-08T05:59:00+02:00'));
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(renders).toBe(mounted);

    setCurrentTimeMs(Date.parse('2025-08-08T06:00:00+02:00'));
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(renders).toBe(mounted + 1);
    expect(result.current).toBe(Date.parse('2025-08-08T06:00:00+02:00'));
  });
});
