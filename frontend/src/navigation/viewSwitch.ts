import { useCallback } from 'react';
import { useTimelineFilter } from '../screens/timeline/TimelineFilterContext';
import { usePlanStore } from '../screens/my-plan/PlanContext';
import { currentTimeMs } from '../utils/clock';
import { navigationRef } from './navigationRef';

// ── Switching between My plan and the timeline ────────────────────────────────
//
// A day button tapped again (DayButton.model's dayPickAction) switches between
// My plan and the timeline, keeping the day. Each screen then lands where it
// would for that day — its remembered scroll, else its own default — with no
// scroll request. My plan switches to the timeline shown last, the Program
// until either has been (kept in memory only, so a cold start begins with the
// Program). Back history records each switch as one position.

let lastSupport = false;

/** Called by a timeline screen when it is shown. */
export function noteTimelineShown(support: boolean): void {
  lastSupport = support;
}

/** Whether the timeline shown last is the Support Program. */
export function lastTimelineSupport(): boolean {
  return lastSupport;
}

/** From My plan: the timeline shown last, on `day`. */
export function useSwitchToTimeline(): (day: number) => void {
  const { setSelectedDayStart } = useTimelineFilter();
  return useCallback((day: number): void => {
    setSelectedDayStart(day);
    if (navigationRef.isReady()) {
      navigationRef.navigate(lastSupport ? 'SupportTimeline' : 'Timeline');
    }
  }, [setSelectedDayStart]);
}

/** From a timeline: My plan, on `day`. */
export function useSwitchToPlan(): (day: number) => void {
  const store = usePlanStore();
  return useCallback((day: number): void => {
    store.pickDay(day, currentTimeMs());
    if (navigationRef.isReady()) {
      navigationRef.navigate('MyPlan');
    }
  }, [store]);
}
