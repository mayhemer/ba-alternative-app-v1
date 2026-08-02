import React, { useCallback, useEffect } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useSelectedSlug } from '../store/AppContext';
import { getFestivalDays } from '../cache/cacheService';
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

  const { events, eventsByCategory, visibleCategories, laneHeights, laneOffsets, categorySubRows, canvasHeight, conflictOverlaps } =
    useTimelineData({ filterArtist, useSubRows });

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarComponent });

  // ── Festival-day initialisation ─────────────────────────────────────────────

  useEffect(() => {
    const days = getFestivalDays(selectedSlug);
    setFestivalDays(days);
    if (days.length === 0) { return; }

    // No default scroll positions are prebuilt here any more. TimelineView derives
    // them from the day it is about to show (`defaultScrollX`), which is the only
    // way the value cannot arrive after the view that reads it.

    if (days.includes(selectedDayStart)) { return; }
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
    // `events` is kept as the "data arrived" signal even though the body no longer
    // reads it — getFestivalDays reads the same cache, and this is what re-runs the
    // effect when a sync repopulates it (same pattern as `revision` in
    // ConflictContext). selectedDayStart is intentionally omitted: re-running on
    // every day switch would fight the user's selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, screenKey, setFestivalDays, setSelectedDayStart]);

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
