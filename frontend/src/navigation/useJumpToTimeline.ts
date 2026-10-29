import { useCallback } from 'react';
import { useTimelineFilter } from '../screens/timeline/TimelineFilterContext';
import { navigationRef } from './navigationRef';
import type { TimelineJump } from './timelineJump';
import type { DbEvent } from '../types/backend';

/**
 * Shows a set on its timeline: selects its day, centres its time and its
 * category's lane, and switches to the matching timeline (support or main).
 * Back history records the move as one position.
 */
export function useJumpToTimeline(): (event: DbEvent, jump: TimelineJump) => void {
  const { setSelectedDayStart, requestScrollToTime } = useTimelineFilter();
  return useCallback((event: DbEvent, jump: TimelineJump): void => {
    const screenKey = jump.support ? 'support' : 'timeline';
    setSelectedDayStart(jump.day);
    requestScrollToTime(screenKey, event.dateFrom, event.dateTo, event.categoryId);
    if (navigationRef.isReady()) {
      if (jump.support) {
        navigationRef.navigate('SupportTimeline');
      } else {
        navigationRef.navigate('Timeline');
      }
    }
  }, [setSelectedDayStart, requestScrollToTime]);
}

/**
 * Shows a set's timeline at now: selects the set's day, switches to its
 * timeline (support or main) and scrolls to now in time only, as today's day
 * button does, leaving the lane the user is on. The now pill on My plan.
 */
export function useJumpToTimelineNow(): (jump: TimelineJump) => void {
  const { setSelectedDayStart, requestScrollToNow } = useTimelineFilter();
  return useCallback((jump: TimelineJump): void => {
    setSelectedDayStart(jump.day);
    requestScrollToNow(jump.support ? 'support' : 'timeline');
    if (navigationRef.isReady()) {
      if (jump.support) {
        navigationRef.navigate('SupportTimeline');
      } else {
        navigationRef.navigate('Timeline');
      }
    }
  }, [setSelectedDayStart, requestScrollToNow]);
}
