import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { minuteNow, subscribeMinute } from '../../hooks/useMinuteNow';
import { timeToX } from './timelineLayout';

// ── The now line's position on a day's canvas ─────────────────────────────────
//
// Follows the shared minute clock (useMinuteNow): "now" floored to the minute,
// moved on each minute boundary and when the app returns to the foreground. The
// value is consumed on the UI thread and written from the clock's listener, so a
// new minute re-renders nothing.

export function useNowX(dayStart: number): SharedValue<number> {
  const nowX = useSharedValue(timeToX(minuteNow(), dayStart));
  useEffect(() => {
    const update = (): void => { nowX.value = timeToX(minuteNow(), dayStart); };
    update();
    return subscribeMinute(update);
  }, [dayStart, nowX]);
  return nowX;
}
