import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import { useAppState } from '../store/AppContext';
import { getFestivalDays } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { TimelineView } from '../components/timeline/TimelineView';
import { DaySwitcher } from '../components/timeline/DaySwitcher';
import { MyScheduleFilterControl } from '../components/timeline/MyScheduleFilterControl';
import { useTimelineData } from '../hooks/useTimelineData';
import {
  DAY_DURATION_MS,
  VIEW_OFFSET_X,
  PIXELS_PER_MS,
  getFestivalDayStart,
} from '../components/timeline/timelineLayout';
import { currentTimeMs } from '../utils/clock';

// ── Shared TopBar / BottomBar slot components ─────────────────────────────────

function TopBarRight() {
  return <MyScheduleFilterControl />;
}


// ── Shared screen logic ───────────────────────────────────────────────────────

type Props = {
  title: string;
  screenKey: string;
  filterArtist?: (artist: DbArtist) => boolean;
  useSubRows?: boolean;
};

export function BaseTimelineScreen({ title, screenKey, filterArtist, useSubRows = false }: Props) {
  const { selectedSlug } = useAppState();
  const { openDetail } = useArtistDetail();
  const {
    setFestivalDays,
    selectedDayStart,
    setSelectedDayStart,
    scrollPositions,
    setScrollPosition,
  } = useTimelineFilter();

  const { events, eventsByCategory, visibleCategories, laneHeights, categorySubRows, canvasHeight } =
    useTimelineData({ filterArtist, useSubRows });

  const BottomBarContent = React.useCallback(() => <DaySwitcher screenKey={screenKey} />, [screenKey]);

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarContent });

  // ── Festival-day initialisation ─────────────────────────────────────────────

  useEffect(() => {
    const days = getFestivalDays(selectedSlug);
    setFestivalDays(days);
    if (days.length === 0) { return; }

    // Prebuild default scroll positions (30 min before first event) for days
    // that have no saved position yet.
    for (const day of days) {
      if ((scrollPositions[screenKey] ?? {})[String(day)] !== undefined) { continue; }
      const dayEnd = day + DAY_DURATION_MS;
      const dayEvents = events.filter((e) => e.dateFrom >= day && e.dateFrom < dayEnd);
      if (dayEvents.length > 0) {
        const firstEventMs = Math.min(...dayEvents.map((e) => e.dateFrom));
        const thirtyMinMs = 30 * 60 * 1000;
        const defaultX = Math.max(0, (firstEventMs - thirtyMinMs - day) * PIXELS_PER_MS - VIEW_OFFSET_X);
        setScrollPosition(screenKey, day, defaultX);
      }
    }

    if (days.includes(selectedDayStart)) { return; }
    const today = getFestivalDayStart(currentTimeMs());
    const todayDay = days.find((d) => d === today);
    setSelectedDayStart(todayDay ?? days[0]);
    // selectedDayStart intentionally omitted — only re-run when events change,
    // not on every day-switch (which would fight the user's selection).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, setFestivalDays, setSelectedDayStart]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const { width } = useWindowDimensions();

  function handleBlockPress(_event: DbEvent, artist: DbArtist): void {
    openDetail(artist, width >= 732 ? 'expanded' : 'collapsed');
  }

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
    />
  );
}
