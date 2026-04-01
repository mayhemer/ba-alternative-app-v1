import React, { useCallback, useEffect, useRef } from 'react';
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
import { NowLine } from './NowLine';
import { TimeRuler } from './TimeRuler';
import { CANVAS_WIDTH, VIEW_OFFSET_X, VIEW_WIDTH } from './timelineLayout';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

type Props = {
  visibleCategories: DbCategory[];
  eventsByCategory: Record<string, LaneEvent[]>;
  laneHeights: Record<string, number>;
  categorySubRows?: Record<string, Record<string, number>>;
  canvasHeight: number;
  selectedDayStart: number;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
};

export function TimelineView({
  visibleCategories,
  eventsByCategory,
  laneHeights,
  categorySubRows,
  canvasHeight,
  selectedDayStart,
  onBlockPress,
}: Props) {
  const { getStatus } = useInterest();
  const { scrollPositions, setScrollPosition } = useTimelineFilter();

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
      setScrollPositionRef.current(prevDay, scrollX.value);
    }
    prevDayRef.current = selectedDayStart;

    const savedX = scrollPositions[String(selectedDayStart)] ?? 0;

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

  // Save scroll position when the screen loses focus (navigating away).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (selectedDayStartRef.current !== 0) {
          setScrollPositionRef.current(selectedDayStartRef.current, scrollX.value);
        }
      };
    }, [scrollX]),
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <TimeRuler dayStart={selectedDayStart} scrollX={scrollX} />
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
              {visibleCategories.map((cat) => (
                <CategoryLane
                  key={cat.categoryId}
                  category={cat}
                  events={eventsByCategory[cat.categoryId] ?? []}
                  dayStart={selectedDayStart}
                  scrollX={scrollX}
                  getStatus={getStatus}
                  onBlockPress={onBlockPress}
                  laneHeight={laneHeights[cat.categoryId]}
                  eventSubRows={categorySubRows?.[cat.categoryId]}
                />
              ))}
              <NowLine dayStart={selectedDayStart} canvasHeight={canvasHeight} />
            </View>
          </View>
        </Animated.ScrollView>
      </ScrollView>
    </View>
  );
}
