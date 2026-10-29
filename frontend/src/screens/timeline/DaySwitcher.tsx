import React, { useCallback, useMemo, useRef } from 'react';
import { useShownDay, useTimelineFilter } from './TimelineFilterContext';
import { DayButtons } from '../../features/timeline/DayButtons';
import { dayButtonModels } from '../../features/timeline/DayButton.model';
import { useFestivalToday } from '../../hooks/useMinuteNow';
import { perfMark } from '../../utils/perfMarks';

// Module-level component — registered as BottomBar ContentComponent for TimelineScreen.
// Reads its own context directly; no props needed. The buttons themselves are
// DayButtons, shared with My plan.

type Props = {
  screenKey: string;
};

export function DaySwitcher({ screenKey }: Props) {
  const { festivalDays, setSelectedDayStart, requestScrollToNow } = useTimelineFilter();
  // The day this switcher's screen shows, derived the same way the screen does,
  // so the active day is right on the first frame.
  const selectedDayStart = useShownDay(screenKey);
  // Today follows the shared minute clock: the notch moves at 06:00.
  const currentDayStart = useFestivalToday(festivalDays);

  // Read at the tap, not a dependency: a callback that changed with the shown
  // day would render every button again on each pick.
  const stateRef = useRef({ selectedDayStart, currentDayStart });
  stateRef.current = { selectedDayStart, currentDayStart };
  const handlePick = useCallback((dayStart: number): void => {
    const { selectedDayStart: shown, currentDayStart: today } = stateRef.current;
    if (dayStart === shown && dayStart === today) {
      requestScrollToNow(screenKey);
    } else {
      // Start of the day-switch mount the device perf runner times;
      // TimelineView marks the end.
      perfMark('day:select');
      setSelectedDayStart(dayStart);
    }
  }, [requestScrollToNow, screenKey, setSelectedDayStart]);

  const buttons = useMemo(
    () => dayButtonModels(festivalDays, { selected: selectedDayStart, today: currentDayStart }),
    [festivalDays, selectedDayStart, currentDayStart],
  );

  if (festivalDays.length === 0) { return null; }

  return <DayButtons buttons={buttons} onPick={handlePick} />;
}
