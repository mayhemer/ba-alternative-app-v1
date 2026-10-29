import React, { useCallback, useMemo, useRef } from 'react';
import { DayButtons } from '../../features/timeline/DayButtons';
import { dayPickAction } from '../../features/timeline/DayButton.model';
import { isNowSettled } from '../../features/timeline/nowInView';
import { useSwitchToTimeline } from '../../navigation/viewSwitch';
import { PLAN_SCREEN_KEY } from './planUtils';
import { planDaySwitcherModel } from './PlanDaySwitcher.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useInterest } from '../../features/interests/InterestContext';
import { usePlanFilters, usePlanShownDay, usePlanStore } from './PlanContext';
import { useMinuteNow } from '../../hooks/useMinuteNow';
import { currentTimeMs } from '../../utils/clock';

// ── My plan's day switcher (BottomBar content) ────────────────────────────────
//
// The timeline's day buttons, always visible, drawn from the switcher's model
// (PlanDaySwitcher.model.ts). What a tap does is the timeline's (dayPickAction):
// the shown day tapped again switches to the timeline shown last, on that day,
// except today's button, which first scrolls to now until now is settled in
// view. Re-renders every minute (for today), but each button renders again only
// when what it shows changes.

export function PlanDaySwitcher() {
  const slug = useSelectedSlug();
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();
  const store = usePlanStore();
  const switchToTimeline = useSwitchToTimeline();
  const shownDay = usePlanShownDay(festivalDays, now);
  const { conflictsOnly } = usePlanFilters();
  const { interests } = useInterest();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);

  const { today, buttons } = useMemo(
    () => planDaySwitcherModel({ festivalDays, shownDay, now, conflictsOnly, interests, inputs: { artists, stages, artistEvents } }),
    [festivalDays, shownDay, now, conflictsOnly, interests, artists, stages, artistEvents],
  );

  // Read at the tap, not a dependency: a callback that changed with the shown
  // day would render every button again on each pick.
  const stateRef = useRef({ selected: shownDay, today });
  stateRef.current = { selected: shownDay, today };
  const handlePick = useCallback((day: number): void => {
    switch (dayPickAction(day, stateRef.current, () => isNowSettled(PLAN_SCREEN_KEY))) {
      case 'now':
        store.requestNow();
        break;
      case 'switch':
        switchToTimeline(day);
        break;
      case 'day':
        store.pickDay(day, currentTimeMs());
        break;
    }
  }, [store, switchToTimeline]);

  if (buttons.length === 0) {
    return null;
  }
  return <DayButtons buttons={buttons} onPick={handlePick} />;
}
