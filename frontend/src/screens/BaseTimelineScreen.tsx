import React, { useCallback, useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import { useSelectedSlug } from '../store/AppContext';
import { getFestivalDays } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { TimelineView } from '../components/timeline/TimelineView';
import { LensChip } from '../components/social/LensChip';
import { useTimelineData } from '../hooks/useTimelineData';
import { getScroll, getSelectedDay, setScroll, setSelectedDay } from '../store/uiStatePersistence';
import {
  DAY_DURATION_MS,
  VIEW_OFFSET_X,
  PIXELS_PER_MS,
  getFestivalDayStart,
} from '../components/timeline/timelineLayout';
import { currentTimeMs } from '../utils/clock';
import { PADDING_BREAKPOINT } from '../styling/tokens';

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

  const { events, eventsByCategory, visibleCategories, laneHeights, categorySubRows, canvasHeight, conflictOverlaps } =
    useTimelineData({ filterArtist, useSubRows });

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarComponent });

  // ── Festival-day initialisation ─────────────────────────────────────────────

  useEffect(() => {
    const days = getFestivalDays(selectedSlug);
    setFestivalDays(days);
    if (days.length === 0) { return; }

    // Prebuild default scroll positions (30 min before first event) for days
    // that have no saved position yet. Reads the hydrated snapshot directly, so
    // a persisted scroll for a day is never overwritten by a default.
    for (const day of days) {
      if (getScroll(screenKey, day) !== undefined) { continue; }
      const dayEnd = day + DAY_DURATION_MS;
      const dayEvents = events.filter((e) => e.dateFrom >= day && e.dateFrom < dayEnd);
      if (dayEvents.length > 0) {
        const firstEventMs = Math.min(...dayEvents.map((e) => e.dateFrom));
        const thirtyMinMs = 30 * 60 * 1000;
        const defaultX = Math.max(0, (firstEventMs - thirtyMinMs - day) * PIXELS_PER_MS - VIEW_OFFSET_X);
        setScroll(screenKey, day, defaultX);
      }
    }

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
    // selectedDayStart intentionally omitted — only re-run when events change,
    // not on every day-switch (which would fight the user's selection).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, screenKey, setFestivalDays, setSelectedDayStart]);

  // Persist the selected day per screen whenever it changes (day switch / restore).
  useEffect(() => {
    if (selectedDayStart !== 0) {
      setSelectedDay(screenKey, selectedDayStart);
    }
  }, [selectedDayStart, screenKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const { width } = useWindowDimensions();

  const handleBlockPress = useCallback((_event: DbEvent, artist: DbArtist): void => {
    openDetail(artist, width >= PADDING_BREAKPOINT ? 'expanded' : 'collapsed');
  }, [openDetail, width]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (selectedDayStart === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-textSecondary text-sm tracking-widest uppercase">
          Loading schedule…
        </Text>
      </View>
    );
  }

  return (
    <TimelineView
      screenKey={screenKey}
      visibleCategories={visibleCategories}
      eventsByCategory={eventsByCategory}
      laneHeights={laneHeights}
      categorySubRows={categorySubRows}
      canvasHeight={canvasHeight}
      selectedDayStart={selectedDayStart}
      onBlockPress={handleBlockPress}
      conflictOverlaps={conflictOverlaps}
    />
  );
}
