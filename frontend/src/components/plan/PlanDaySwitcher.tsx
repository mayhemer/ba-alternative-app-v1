import React, { useCallback, useMemo, useRef } from 'react';
import { DayButtons } from '../timeline/DayButtons';
import { dayPickAction } from '../timeline/DayButton.model';
import { planDaySwitcherModel } from './PlanDaySwitcher.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { usePlanFilters, usePlanShownDay, usePlanStore } from '../../context/PlanContext';
import { useMinuteNow } from '../../hooks/useMinuteNow';
import { currentTimeMs } from '../../utils/clock';

// ── My plan's day switcher (BottomBar content) ────────────────────────────────
//
// The timeline's day buttons, always visible, drawn from the switcher's model
// (PlanDaySwitcher.model.ts). Tapping today's button while today is shown
// scrolls to now, as on the timeline. Re-renders every minute (for today), but
// each button renders again only when what it shows changes.

export function PlanDaySwitcher() {
  const slug = useSelectedSlug();
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();
  const store = usePlanStore();
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
    if (dayPickAction(day, stateRef.current) === 'now') {
      store.requestNow();
    } else {
      store.pickDay(day, currentTimeMs());
    }
  }, [store]);

  if (buttons.length === 0) {
    return null;
  }
  return <DayButtons buttons={buttons} onPick={handlePick} />;
}
