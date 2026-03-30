import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useAppState, useCacheRefresh } from '../store/AppContext';
import { getArtists, getCategories, getEvents } from '../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent } from '../types/backend';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useInterest } from '../context/InterestContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { CategoryLane } from '../components/timeline/CategoryLane';
import type { LaneEvent } from '../components/timeline/CategoryLane';
import { NowLine } from '../components/timeline/NowLine';
import { TimeRuler } from '../components/timeline/TimeRuler';
import { DaySwitcher } from '../components/timeline/DaySwitcher';
import { MyScheduleFilterControl } from '../components/timeline/MyScheduleFilterControl';
import {
  CANVAS_WIDTH,
  RULER_HEIGHT,
  STRIP_HEIGHT,
  LANE_HEIGHT,
  DAY_DURATION_MS,
  VIEW_OFFSET_X,
  VIEW_WIDTH,
  deriveFestivalDays,
  getFestivalDayStart,
} from '../components/timeline/timelineLayout';

// ── TopBar / BottomBar slot components (module-level for stable refs) ─────────

function TimelineTopBarRight() {
  return <MyScheduleFilterControl />;
}

function TimelineBottomBar() {
  return <DaySwitcher />;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function TimelineScreen() {
  const { selectedSlug } = useAppState();
  const { getStatus } = useInterest();
  const { openDetail } = useArtistDetail();
  const {
    setFestivalDays,
    selectedDayStart,
    setSelectedDayStart,
    myScheduleOnly,
    hiddenCategories,
    scrollPositions,
    setScrollPosition,
  } = useTimelineFilter();

  // ── Data loading ────────────────────────────────────────────────────────────

  const eventsRef     = useRef<DbEvent[]>([]);
  const artistsRef    = useRef<DbArtist[]>([]);
  const categoriesRef = useRef<DbCategory[]>([]);
  const [, setRevision] = React.useState(0);

  const loadData = useCallback(() => {
    eventsRef.current     = getEvents(selectedSlug);
    artistsRef.current    = getArtists(selectedSlug);
    categoriesRef.current = getCategories(selectedSlug);
    setRevision((r) => r + 1);
  }, [selectedSlug]);

  useEffect(() => { loadData(); }, [loadData]);
  useCacheRefresh(loadData);

  useTopBar({ title: 'Timeline', RightComponent: TimelineTopBarRight });
  useBottomBar({ ContentComponent: TimelineBottomBar });

  // ── Festival-day initialisation ─────────────────────────────────────────────

  useEffect(() => {
    const days = deriveFestivalDays(eventsRef.current);
    setFestivalDays(days);
    if (days.length === 0) { return; }
    if (days.includes(selectedDayStart)) { return; }
    const today = getFestivalDayStart(Date.now());
    const todayDay = days.find((d) => d === today);
    setSelectedDayStart(todayDay ?? days[0]);
    // selectedDayStart intentionally omitted — only re-run when events change,
    // not on every day-switch (which would fight the user's selection).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsRef.current, setFestivalDays, setSelectedDayStart]);

  // ── Horizontal scroll tracking ──────────────────────────────────────────────

  const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // ── Scroll save / restore on day switch ────────────────────────────────────

  const prevDayRef           = useRef(0);
  const selectedDayStartRef  = useRef(selectedDayStart);
  const setScrollPositionRef = useRef(setScrollPosition);

  useEffect(() => { selectedDayStartRef.current  = selectedDayStart;  }, [selectedDayStart]);
  useEffect(() => { setScrollPositionRef.current = setScrollPosition; }, [setScrollPosition]);

  useEffect(() => {
    if (selectedDayStart === 0) { return; }

    const prevDay = prevDayRef.current;
    if (prevDay !== 0 && prevDay !== selectedDayStart) {
      // Save the previous day's scroll position before switching.
      setScrollPositionRef.current(prevDay, scrollX.value);
    }
    prevDayRef.current = selectedDayStart;

    // Restore the saved position for the newly selected day.
    const savedX = scrollPositions[String(selectedDayStart)] ?? 0;
    // One-frame delay lets the new day's content render before we scroll.
    const timer = setTimeout(() => {
      scrollTo(horizontalScrollRef, savedX, 0, false);
    }, 16);
    return () => clearTimeout(timer);
    // scrollPositions intentionally omitted — restoring should only happen
    // when the day changes, not every time the map is updated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayStart]);

  // Save scroll position when the screen loses focus (navigating away).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (selectedDayStartRef.current !== 0) {
          setScrollPositionRef.current(selectedDayStartRef.current, scrollX.value);
        }
      };
    }, []),
  );

  // ── Derived display data ────────────────────────────────────────────────────

  const artistById = useMemo<Record<string, DbArtist>>(() => {
    const map: Record<string, DbArtist> = {};
    for (const a of artistsRef.current) {
      map[a.artistId] = a;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistsRef.current]);

  const eventsByCategory = useMemo<Record<string, LaneEvent[]>>(() => {
    if (selectedDayStart === 0) { return {}; }
    const dayEnd = selectedDayStart + DAY_DURATION_MS;
    const grouped: Record<string, LaneEvent[]> = {};

    for (const event of eventsRef.current) {
      if (event.dateFrom < selectedDayStart || event.dateFrom >= dayEnd) { continue; }
      const artist = artistById[event.artistId];
      if (artist === undefined || !artist.isPlayable) { continue; }
      if (myScheduleOnly && getStatus(artist.artistId) === 'none') { continue; }
      if (grouped[event.categoryId] === undefined) {
        grouped[event.categoryId] = [];
      }
      grouped[event.categoryId].push({ event, artist });
    }
    return grouped;
  }, [artistById, selectedDayStart, myScheduleOnly, getStatus]);

  const visibleCategories = useMemo<DbCategory[]>(() => {
    return categoriesRef.current.sort(
      (a, b) => parseInt(a.categoryId) - parseInt(b.categoryId)
    ).filter(
      (c) =>
        !hiddenCategories.has(c.categoryId) &&
        (eventsByCategory[c.categoryId]?.length ?? 0) > 0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesRef.current, hiddenCategories, eventsByCategory]);

  const canvasHeight =
    RULER_HEIGHT + visibleCategories.length * (STRIP_HEIGHT + LANE_HEIGHT);

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
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <Animated.ScrollView
        ref={horizontalScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* Clipping wrapper sized to the visible window only */}
        <View style={{ width: VIEW_WIDTH, overflow: 'hidden' }}>
        {/* Full canvas shifted left so 09:30 aligns with x=0 */}
        <View style={{ width: CANVAS_WIDTH, position: 'relative', transform: [{ translateX: -VIEW_OFFSET_X }] }}>
          <TimeRuler dayStart={selectedDayStart} />
          {visibleCategories.map((cat) => (
            <CategoryLane
              key={cat.categoryId}
              category={cat}
              events={eventsByCategory[cat.categoryId] ?? []}
              dayStart={selectedDayStart}
              scrollX={scrollX}
              getStatus={getStatus}
              onBlockPress={handleBlockPress}
            />
          ))}
          <NowLine dayStart={selectedDayStart} canvasHeight={canvasHeight} />
        </View>
        </View>
      </Animated.ScrollView>
    </ScrollView>
  );
}
