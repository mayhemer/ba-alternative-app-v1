import { useCallback, useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import { currentTimeMs } from '../utils/clock';
import { festivalToday } from '../utils/festivalTime';

// ── A shared minute clock ─────────────────────────────────────────────────────
//
// "Now" for everything time-based — My plan, the now pill, the timelines' now
// lines and the day buttons' today notch — at minute
// resolution: one timer for the whole app, firing on the minute boundary, and an
// immediate tick when the app returns to the foreground — timers stall while
// the phone is locked, and a stale countdown is what this must never show.
//
// A module-level store rather than a context: only the subscribers re-render on
// a tick, and the timer runs only while something subscribes.
//
// The snapshot is floored to the minute, so it is stable between ticks (React
// reads it more than once per render) and identical for every subscriber.

const MINUTE_MS = 60 * 1000;

function currentMinute(): number {
  const ms = currentTimeMs();
  return ms - (ms % MINUTE_MS);
}

let now = currentMinute();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

function tick(): void {
  now = currentMinute();
  listeners.forEach((listener) => { listener(); });
}

function scheduleNextMinute(): void {
  const ms = currentTimeMs();
  timer = setTimeout(() => {
    tick();
    scheduleNextMinute();
  }, MINUTE_MS - (ms % MINUTE_MS));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = currentMinute();
    scheduleNextMinute();
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick();
      }
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      appStateSubscription?.remove();
      appStateSubscription = null;
    }
  };
}

function getSnapshot(): number {
  // With nobody subscribed the timer is off: read the clock rather than return
  // a minute that may be long gone.
  if (listeners.size === 0) {
    now = currentMinute();
  }
  return now;
}

/** "Now" in Unix ms, floored to the minute; re-renders on every new minute. */
export function useMinuteNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Calls `listener` on every new minute (and on return to the foreground),
 * outside React: for values drawn on the UI thread, such as a now line's
 * position, which must not re-render anything. Returns the unsubscribe.
 */
export function subscribeMinute(listener: () => void): () => void {
  return subscribe(listener);
}

/** The current minute, as useMinuteNow reports it. */
export function minuteNow(): number {
  return getSnapshot();
}

/**
 * The festival day that holds now (festivalToday), or null outside the
 * festival. Re-renders only when that day changes, at 06:00, not every minute.
 */
export function useFestivalToday(festivalDays: readonly number[]): number | null {
  const getToday = useCallback((): number | null => festivalToday(festivalDays, getSnapshot()), [festivalDays]);
  return useSyncExternalStore(subscribe, getToday, getToday);
}
