import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useFocusEffect } from '@react-navigation/native';
import { useInterest } from '../../context/InterestContext';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { getScroll, setScroll } from '../../store/uiStatePersistence';
import { CategoryLane } from './CategoryLane';
import type { LaneEvent } from './CategoryLane';
import { TimeRuler } from './TimeRuler';
import { LaneLabelOverlay } from './LaneLabelOverlay';
import { CANVAS_WIDTH, VIEW_OFFSET_X, VIEW_WIDTH, PIXELS_PER_MS, labelRepeatPx, timeToX } from './timelineLayout';
import { currentTimeMs } from '../../utils/clock';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { ConflictOverlap } from '../../utils/conflictUtils';

// Horizontal space kept to the left of an event's start when scrolling to it.
const LEFT_PADDING_X = 15 * 60 * 1000 * PIXELS_PER_MS; // 15 minutes

type Props = {
  screenKey: string;
  visibleCategories: DbCategory[];
  eventsByCategory: Record<string, LaneEvent[]>;
  laneHeights: Record<string, number>;
  laneOffsets: Record<string, number>;
  categorySubRows?: Record<string, Record<string, number>>;
  canvasHeight: number;
  selectedDayStart: number;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
};

export function TimelineView({
  screenKey,
  visibleCategories,
  eventsByCategory,
  laneHeights,
  laneOffsets,
  categorySubRows,
  canvasHeight,
  selectedDayStart,
  onBlockPress,
  conflictOverlaps,
}: Props) {
  const [areaHeight, setAreaHeight] = useState(0);
  // The same measurement in two forms: a ref for the scroll-to-event centring,
  // which reads it imperatively, and state for the label spacing, which has to
  // re-render the lanes when the viewport resizes.
  const scrollViewWidthRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const { getStatus } = useInterest();
  const { scrollToTimeSignal } = useTimelineFilter();
  const { bottomClearance } = useLayoutMode();

  // ── Horizontal scroll tracking ──────────────────────────────────────────────

  const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const lastPersist = useSharedValue(0);

  const selectedDayStartRef = useRef(selectedDayStart);
  useEffect(() => { selectedDayStartRef.current = selectedDayStart; }, [selectedDayStart]);

  // Persist the settled scroll offset for the current day. Called on JS thread
  // from the scroll-gesture-end worklets, so it reads the current day from a ref.
  const persistCurrentScroll = useCallback((x: number): void => {
    if (selectedDayStartRef.current !== 0) {
      setScroll(screenKey, selectedDayStartRef.current, x);
    }
  }, [screenKey]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      // Persist continuously while scrolling (throttled). Drag/momentum-end
      // events don't fire for web wheel scrolling, so saving here keeps the
      // position current on every platform; the module debounces the write.
      const now = Date.now();
      if (now - lastPersist.value >= 32) {
        lastPersist.value = now;
        scheduleOnRN(persistCurrentScroll, event.contentOffset.x);
      }
    },
    // Native: capture the exact final offset when the gesture settles.
    onEndDrag: (event) => {
      scheduleOnRN(persistCurrentScroll, event.contentOffset.x);
    },
    onMomentumEnd: (event) => {
      scheduleOnRN(persistCurrentScroll, event.contentOffset.x);
    },
  }, [persistCurrentScroll]);

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

  const prevDayRef = useRef(0);

  useEffect(() => {
    if (selectedDayStart === 0) { return; }

    const prevDay = prevDayRef.current;
    if (prevDay !== 0 && prevDay !== selectedDayStart) {
      setScroll(screenKey, prevDay, scrollX.value);
    }
    prevDayRef.current = selectedDayStart;

    const savedX = getScroll(screenKey, selectedDayStart) ?? 0;

    if (prevDay === 0) {
      const timer = setTimeout(() => {
        scheduleOnUI(() => { scrollTo(horizontalScrollRef, savedX, 0, false); });
      }, 50);
      return () => clearTimeout(timer);
    }

    scheduleOnUI(() => { scrollTo(horizontalScrollRef, savedX, 0, false); });
    // Only re-run when the day changes; the saved offset is read imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayStart]);

  // ── Scroll to a specific time (centered) ─────────────────────────────────────
  // Fired both by the day-switcher "now" button and when navigating here from an
  // event (e.g. the artist detail). Deferred so it runs after the day-switch
  // restore (which may use a 50 ms timer on a fresh mount) and after the
  // ScrollView has measured its width.

  useEffect(() => {
    if (scrollToTimeSignal.counter === 0) { return; }
    if (scrollToTimeSignal.screenKey !== screenKey) { return; }
    const { fromMs, toMs } = scrollToTimeSignal;
    const timer = setTimeout(() => {
      const day = selectedDayStartRef.current;
      // Content-space X (canvas is shifted left by VIEW_OFFSET_X).
      const centreX = timeToX((fromMs + toMs) / 2, day) - VIEW_OFFSET_X;
      const startX  = timeToX(fromMs, day) - VIEW_OFFSET_X;
      // Centre the event's midpoint, but never scroll so far that the start loses
      // its left padding (long events).
      const centredOffset = centreX - scrollViewWidthRef.current / 2;
      const targetX = Math.max(0, Math.min(centredOffset, startX - LEFT_PADDING_X));
      scheduleOnUI(() => { scrollTo(horizontalScrollRef, targetX, 0, true); });
    }, 120);
    return () => clearTimeout(timer);
  // selectedDayStart read via ref inside the timer — the signal carries its own time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTimeSignal]);

  // Save scroll position when the screen loses focus (navigating away).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (selectedDayStartRef.current !== 0) {
          setScroll(screenKey, selectedDayStartRef.current, scrollX.value);
        }
      };
    }, [scrollX, screenKey]),
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const labelRepeat = labelRepeatPx(viewportWidth);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { setAreaHeight(e.nativeEvent.layout.height); }}>
      <TimeRuler dayStart={selectedDayStart} scrollX={scrollX} nowX={nowX} />
      <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
        {/* Wrapper so the label overlay can sit beside the horizontal scroller:
            inside the vertical one (so it scrolls with the lanes) but outside the
            horizontal one (so horizontal scroll cannot move it). */}
        <View>
          <Animated.ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            onLayout={(e) => {
              const measured = e.nativeEvent.layout.width;
              scrollViewWidthRef.current = measured;
              setViewportWidth(measured);
            }}
          >
            {/* Clipping wrapper sized to the visible window only */}
            <View style={{ width: VIEW_WIDTH, overflow: 'hidden' }}>
              {/* Full canvas shifted left so 09:30 aligns with x=0 */}
              <View style={{ width: CANVAS_WIDTH, position: 'relative', transform: [{ translateX: -VIEW_OFFSET_X }], paddingBottom: Math.max(30 + bottomClearance, areaHeight - canvasHeight)}}>
                {visibleCategories.map((cat) => (
                  <CategoryLane
                    key={cat.categoryId}
                    category={cat}
                    events={eventsByCategory[cat.categoryId] ?? []}
                    dayStart={selectedDayStart}
                    nowX={nowX}
                    getStatus={getStatus}
                    onBlockPress={onBlockPress}
                    labelRepeat={labelRepeat}
                    laneHeight={laneHeights[cat.categoryId]}
                    eventSubRows={categorySubRows?.[cat.categoryId]}
                    conflictOverlaps={conflictOverlaps}
                  />
                ))}
              </View>
            </View>
          </Animated.ScrollView>
          <LaneLabelOverlay categories={visibleCategories} laneOffsets={laneOffsets} />
        </View>
      </ScrollView>
    </View>
  );
}
