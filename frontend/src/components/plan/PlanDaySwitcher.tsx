import React, { useCallback, useMemo } from 'react';
import { DayButtons } from '../timeline/DayButtons';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { usePlanFilters, usePlanShownDay, usePlanStore } from '../../context/PlanContext';
import { useMinuteNow } from '../../hooks/useMinuteNow';
import { daysWithClash } from '../../utils/planUtils';
import { getFestivalDayStart } from '../timeline/timelineLayout';
import { currentTimeMs } from '../../utils/clock';

// ── My plan's day switcher (BottomBar content) ────────────────────────────────
//
// The timeline's day buttons, always visible. Tapping today's button while today
// is shown scrolls to now, as on the timeline. In conflicts-only mode, days with
// a Must-see clash carry the clash stripe.

export function PlanDaySwitcher() {
  const slug = useSelectedSlug();
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();
  const store = usePlanStore();
  const shown = usePlanShownDay(festivalDays, now);
  const { conflictsOnly } = usePlanFilters();
  const { interests } = useInterest();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);

  const todayStart = getFestivalDayStart(now);
  const today = festivalDays.includes(todayStart) ? todayStart : null;

  const marked = useMemo(
    () => (conflictsOnly ? daysWithClash(interests, { artists, stages, artistEvents }) : undefined),
    [conflictsOnly, interests, artists, stages, artistEvents],
  );

  const handlePick = useCallback((day: number): void => {
    if (day === shown && day === today) {
      store.requestNow();
    } else {
      store.pickDay(day, currentTimeMs());
    }
  }, [shown, today, store]);

  if (festivalDays.length === 0) {
    return null;
  }
  return <DayButtons days={festivalDays} selected={shown} today={today} onPick={handlePick} marked={marked} />;
}
