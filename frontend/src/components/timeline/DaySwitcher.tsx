import React, { useCallback } from 'react';
import { useShownDay, useTimelineFilter } from '../../context/TimelineFilterContext';
import { DayButtons } from './DayButtons';
import { currentTimeMs } from '../../utils/clock';
import { perfMark } from '../../utils/perfMarks';

// Module-level component — registered as BottomBar ContentComponent for TimelineScreen.
// Reads its own context directly; no props needed. The buttons themselves are
// DayButtons, shared with My plan.

const DAY_MS = 24 * 60 * 60 * 1000;

function getCurrentDayStart(festivalDays: number[]): number | null {
  const now = currentTimeMs();
  for (const dayStart of festivalDays) {
    if (now >= dayStart && now < dayStart + DAY_MS) {
      return dayStart;
    }
  }
  return null;
}

type Props = {
  screenKey: string;
};

export function DaySwitcher({ screenKey }: Props) {
  const { festivalDays, setSelectedDayStart, requestScrollToNow } = useTimelineFilter();
  // The day this switcher's screen shows, derived the same way the screen does,
  // so the active day is right on the first frame.
  const selectedDayStart = useShownDay(screenKey);
  const currentDayStart = getCurrentDayStart(festivalDays);

  const handlePick = useCallback((dayStart: number): void => {
    if (dayStart === selectedDayStart && dayStart === currentDayStart) {
      requestScrollToNow(screenKey);
    } else {
      // Start of the day-switch mount the device perf runner times;
      // TimelineView marks the end.
      perfMark('day:select');
      setSelectedDayStart(dayStart);
    }
  }, [selectedDayStart, currentDayStart, requestScrollToNow, screenKey, setSelectedDayStart]);

  if (festivalDays.length === 0) { return null; }

  return (
    <DayButtons
      days={festivalDays}
      selected={selectedDayStart}
      today={currentDayStart}
      onPick={handlePick}
    />
  );
}
