import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useMinuteNow } from './useMinuteNow';
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
