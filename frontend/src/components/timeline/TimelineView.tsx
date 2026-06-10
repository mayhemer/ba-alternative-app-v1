import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { useFocusEffect } from '@react-navigation/native';
import { useInterest } from '../../context/InterestContext';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { CategoryLane } from './CategoryLane';
import type { LaneEvent } from './CategoryLane';
import { TimeRuler } from './TimeRuler';
import { CANVAS_WIDTH, VIEW_OFFSET_X, VIEW_WIDTH, timeToX } from './timelineLayout';
import { currentTimeMs } from '../../utils/clock';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

type Props = {
  screenKey: string;
  visibleCategories: DbCategory[];
  eventsByCategory: Record<string, LaneEvent[]>;
  laneHeights: Record<string, number>;
  categorySubRows?: Record<string, Record<string, number>>;
  canvasHeight: number;
  selectedDayStart: number;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
  conflictingEventIds: Set<string>;
};

export function TimelineView({
  screenKey,
  visibleCategories,
  eventsByCategory,
  laneHeights,
  categorySubRows,
  canvasHeight,
  selectedDayStart,
  onBlockPress,
  conflictingEventIds,
}: Props) {
  const [areaHeight, setAreaHeight] = useState(0);
  const scrollViewWidthRef = useRef(0);
  const { getStatus } = useInterest();
  const { scrollPositions, setScrollPosition, scrollToNowSignal } = useTimelineFilter();

  // ── Horizontal scroll tracking ──────────────────────────────────────────────

  const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // ── Now-line position ────────────────────────────────────────────────────────
  // Computed once here and shared with every NowLine. A single interval keeps it
  // current; the value is consumed on the UI thread, so updates cause no JS re-renders.

  const nowX = useSharedValue(timeToX(currentTimeMs(), selectedDayStart));

  useEffect(() => {
    nowX.value = timeToX(currentTimeMs(), selectedDayStart);
    const interval = setInterval(() => {
      nowX.value = timeToX(currentTimeMs(), selectedDayStart);
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedDayStart, nowX]);

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
      setScrollPositionRef.current(screenKey, prevDay, scrollX.value);
    }
    prevDayRef.current = selectedDayStart;

    const savedX = (scrollPositions[screenKey] ?? {})[String(selectedDayStart)] ?? 0;

    if (prevDay === 0) {
      const timer = setTimeout(() => {
        scheduleOnUI(() => { scrollTo(horizontalScrollRef, savedX, 0, false); });
      }, 50);
      return () => clearTimeout(timer);
    }

    scheduleOnUI(() => { scrollTo(horizontalScrollRef, savedX, 0, false); });
    // scrollPositions intentionally omitted — restoring should only happen
    // when the day changes, not every time the map is updated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayStart]);

  // ── Scroll to now ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollToNowSignal.counter === 0) { return; }
    if (scrollToNowSignal.screenKey !== screenKey) { return; }
    const nowXValue = timeToX(currentTimeMs(), selectedDayStart);
    const targetX = Math.max(0, nowXValue - VIEW_OFFSET_X - scrollViewWidthRef.current / 2);
    scheduleOnUI(() => { scrollTo(horizontalScrollRef, targetX, 0, true); });
  // selectedDayStart is intentionally omitted — the signal always fires for the current day
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToNowSignal]);

  // Save scroll position when the screen loses focus (navigating away).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (selectedDayStartRef.current !== 0) {
          setScrollPositionRef.current(screenKey, selectedDayStartRef.current, scrollX.value);
        }
      };
    }, [scrollX, screenKey]),
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { setAreaHeight(e.nativeEvent.layout.height); }}>
      <TimeRuler dayStart={selectedDayStart} scrollX={scrollX} nowX={nowX} />
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        <Animated.ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={(e) => { scrollViewWidthRef.current = e.nativeEvent.layout.width; }}
        >
          {/* Clipping wrapper sized to the visible window only */}
          <View style={{ width: VIEW_WIDTH, overflow: 'hidden' }}>
            {/* Full canvas shifted left so 09:30 aligns with x=0 */}
            <View style={{ width: CANVAS_WIDTH, position: 'relative', transform: [{ translateX: -VIEW_OFFSET_X }], paddingBottom: Math.max(30, areaHeight - canvasHeight)}}>
              {visibleCategories.map((cat) => (
                <CategoryLane
                  key={cat.categoryId}
                  category={cat}
                  events={eventsByCategory[cat.categoryId] ?? []}
                  dayStart={selectedDayStart}
                  scrollX={scrollX}
                  nowX={nowX}
                  getStatus={getStatus}
                  onBlockPress={onBlockPress}
                  laneHeight={laneHeights[cat.categoryId]}
                  eventSubRows={categorySubRows?.[cat.categoryId]}
                  conflictingEventIds={conflictingEventIds}
                />
              ))}
            </View>
          </View>
        </Animated.ScrollView>
      </ScrollView>
    </View>
  );
}
