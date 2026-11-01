import React, { useCallback, useMemo, useRef } from 'react';
import { DayButtons } from '../../features/timeline/DayButtons';
import { dayPickAction } from '../../features/timeline/DayButton.model';
import { planDaySwitcherModel } from './PlanDaySwitcher.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useDeferredInterests } from '../../features/interests/InterestContext';
import { usePlanFilters, usePlanShownDay, usePlanStore } from './PlanContext';
import { useFestivalDayStart } from '../../hooks/useMinuteNow';
import { currentTimeMs } from '../../utils/clock';

// ── My plan's day switcher (BottomBar content) ────────────────────────────────
//
// The timeline's day buttons, always visible, drawn from the switcher's model
// (PlanDaySwitcher.model.ts). Tapping today's button while today is shown
// scrolls to now, as on the timeline. Everything here depends on now only
// through its festival day — today, and the day shown by default — so it reads
// the clock at day resolution and re-renders at 06:00, not on every minute.
// Each button renders again only when what it shows changes.

export function PlanDaySwitcher() {
  const slug = useSelectedSlug();
  const festivalDays = useFestivalDays(slug);
  // The 06:00 that started today: an instant of the day, which is all the
  // model and the shown day read from now.
  const now = useFestivalDayStart();
  const store = usePlanStore();
  const shownDay = usePlanShownDay(festivalDays, now);
  const conflictsOnly = usePlanFilters().level === 'conflicts';
  // Deferred, the same picks the list and the conflicts follow.
  const interests = useDeferredInterests();
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
