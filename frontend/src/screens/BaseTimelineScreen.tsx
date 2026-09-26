import React, { useCallback, useEffect, useRef } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useSelectedSlug } from '../store/AppContext';
import { useFestivalDays } from '../store/cacheStore';
import type { DbArtist, DbEvent } from '../types/backend';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { TimelineView } from '../components/timeline/TimelineView';
import { LensChip } from '../components/social/LensChip';
import { useTimelineData } from '../hooks/useTimelineData';
import { getSelectedDay, setSelectedDay } from '../store/uiStatePersistence';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import { currentTimeMs } from '../utils/clock';
import { useLayoutMode } from '../hooks/useLayoutMode';

// ── Shared TopBar / BottomBar slot components ─────────────────────────────────

function TopBarRight() {
  return <LensChip />;
}


// ── Shared screen logic ───────────────────────────────────────────────────────

type Props = {
  title: string;
  screenKey: string;
  BottomBarComponent: React.ComponentType;
  filterArtist?: (artist: DbArtist) => boolean;
  useSubRows?: boolean;
};

export function BaseTimelineScreen({ title, screenKey, BottomBarComponent, filterArtist, useSubRows = false }: Props) {
  const selectedSlug = useSelectedSlug();
  const { openDetail } = useArtistDetail();
  const {
    setFestivalDays,
    selectedDayStart,
    setSelectedDayStart,
  } = useTimelineFilter();

  const { eventsByCategory, visibleCategories, laneHeights, laneOffsets, categorySubRows, canvasHeight, conflictOverlaps } =
    useTimelineData({ filterArtist, useSubRows });

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarComponent });

  // ── Festival-day initialisation ─────────────────────────────────────────────

  // The days themselves, subscribed — so this effect re-runs when a sync
  // repopulates the cache. It used to depend on `events` as a stand-in for
  // "the cache changed", which needed an exhaustive-deps suppression to keep.
  const days = useFestivalDays(selectedSlug);

  // Latest selected day without making it a trigger: re-running this effect on
  // every day switch would fight the user's own selection. A ref says exactly
  // that, where omitting a real dependency only hid it from ESLint.
  const selectedDayRef = useRef(selectedDayStart);
  selectedDayRef.current = selectedDayStart;

  useEffect(() => {
    setFestivalDays(days);
    if (days.length === 0) { return; }

    // No default scroll positions are prebuilt here any more. TimelineView derives
    // them from the day it is about to show (`defaultScrollX`), which is the only
    // way the value cannot arrive after the view that reads it.

    if (days.includes(selectedDayRef.current)) { return; }
    // Restore the persisted day if it is still valid, else fall back to today,
    // else the first festival day.
    const persistedDay = getSelectedDay(screenKey);
    if (persistedDay !== undefined && days.includes(persistedDay)) {
      setSelectedDayStart(persistedDay);
      return;
    }
    const today = getFestivalDayStart(currentTimeMs());
    const todayDay = days.find((d) => d === today);
    setSelectedDayStart(todayDay ?? days[0]);
  }, [days, screenKey, setFestivalDays, setSelectedDayStart]);

  // Persist the selected day per screen whenever it changes (day switch / restore).
  useEffect(() => {
    if (selectedDayStart !== 0) {
      setSelectedDay(screenKey, selectedDayStart);
    }
  }, [selectedDayStart, screenKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const { isWide } = useLayoutMode();

  // A roomy viewport has space to show the whole sheet at once; elsewhere it
  // opens at the collapsed stop, which stays usable on short screens because
  // ArtistDetailSheet floors it in points rather than a percentage.
  const handleBlockPress = useCallback((_event: DbEvent, artist: DbArtist): void => {
    openDetail(artist, isWide ? 'expanded' : 'collapsed');
  }, [openDetail, isWide]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (selectedDayStart === 0) {
    return <LoadingScreen message="Loading schedule…" />;
  }

  return (
    <TimelineView
      screenKey={screenKey}
      visibleCategories={visibleCategories}
      eventsByCategory={eventsByCategory}
      laneHeights={laneHeights}
      laneOffsets={laneOffsets}
      categorySubRows={categorySubRows}
      canvasHeight={canvasHeight}
      selectedDayStart={selectedDayStart}
      onBlockPress={handleBlockPress}
      conflictOverlaps={conflictOverlaps}
    />
  );
}
