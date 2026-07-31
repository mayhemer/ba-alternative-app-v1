import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
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
import {
  CANVAS_WIDTH,
  LANE_HEIGHT,
  RULER_HEIGHT,
  stripHeightFor,
  VIEW_OFFSET_X,
  VIEW_WIDTH,
  PIXELS_PER_MS,
  labelRepeatPx,
  timeToX,
} from './timelineLayout';
import { colors } from '../../styling/tokens';
import { currentTimeMs } from '../../utils/clock';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { ConflictOverlap } from '../../utils/conflictUtils';

// Stable identity for a category that ended up with no events, so the lane's
// memo is not defeated by a fresh literal on every render.
const NO_LANE_EVENTS: LaneEvent[] = [];

// Horizontal space kept to the left of an event's start when scrolling to it.
const LEFT_PADDING_X = 15 * 60 * 1000 * PIXELS_PER_MS; // 15 minutes

// ── Progressive mount ─────────────────────────────────────────────────────────
//
// A festival day is ~75 blocks across ~15 lanes, and the canvas is roughly nine
// phone screens wide by three tall — so mounting a day in one go creates several
// hundred native views of which about a tenth can be seen. On a low-end Android
// that pinned the UI thread for well over a second on every day switch.
//
// The day is mounted in slices instead: first the span actually on screen, then
// one further viewport in every direction per frame until the whole day is up.
// The window only ever grows and stops once the day is complete, so a settled
// day behaves exactly as before — scrolling and panning trigger no JS render.
// The lanes themselves are always rendered at full height, so nothing reflows as
// blocks appear.

// Viewport assumed for the first slice, before onLayout has measured anything,
// and a floor under the growth step so a degenerate measurement cannot leave the
// window creeping towards the end of the canvas for hundreds of frames.
const MOUNT_FALLBACK_WIDTH = 420;
const MOUNT_FALLBACK_HEIGHT = 640;
const MOUNT_MIN_STEP = 200;

/** Canvas-X span currently mounted, plus the day it was anchored for. */
type MountWindow = { day: number; fromX: number; toX: number; fromY: number; toY: number };

// Anything outside the scrollable window is permanently clipped, so the X span
// is held within it — those blocks are then never mounted at all.
function clampToViewWindow(x: number): number {
  return Math.min(VIEW_OFFSET_X + VIEW_WIDTH, Math.max(VIEW_OFFSET_X, x));
}

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
  const { bottomClearance, isShort } = useLayoutMode();

  // Landscape overlays the category title on its lane instead of reserving a
  // strip above it. useTimelineData reads the same flag from the same hook, so
  // the offsets it hands down cannot disagree with the layout rendered here.
  const stripHeight = stripHeightFor(isShort);

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

  // Vertical offset of the lane stack. Only ever read at the moment of a day
  // switch, to know which lanes to mount first, so a coarsely-sampled ref is
  // enough — and unlike a shared value it can be read during render.
  const scrollYRef = useRef(0);
  const onVerticalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Imperative handle for the scroll-to-event jump below. A plain ref is enough:
  // unlike the horizontal offset, this one is never read on the UI thread.
  const verticalScrollRef = useRef<ScrollView>(null);

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

  // ── Progressive mount window ────────────────────────────────────────────────

  const mountWidth  = Math.max(MOUNT_MIN_STEP, viewportWidth > 0 ? viewportWidth : MOUNT_FALLBACK_WIDTH);
  const mountHeight = Math.max(MOUNT_MIN_STEP, areaHeight    > 0 ? areaHeight    : MOUNT_FALLBACK_HEIGHT);

  const [mountWindow, setMountWindow] = useState<MountWindow>({ day: 0, fromX: 0, toX: 0, fromY: 0, toY: 0 });

  // Re-anchored during render rather than in an effect: an effect would only run
  // after the new day had already been rendered in full, which is the cost this
  // whole mechanism exists to avoid. The horizontal offset is the one the restore
  // effect above scrolls to, so the first slice is the span the user is about to
  // see; the vertical one is wherever the lane stack is already parked.
  if (mountWindow.day !== selectedDayStart) {
    const anchorX = (getScroll(screenKey, selectedDayStart) ?? 0) + VIEW_OFFSET_X;
    const anchorY = scrollYRef.current;
    setMountWindow({
      day: selectedDayStart,
      fromX: clampToViewWindow(anchorX),
      toX: clampToViewWindow(anchorX + mountWidth),
      fromY: anchorY,
      toY: anchorY + mountHeight,
    });
  }

  // laneOffsets are measured from the top of the lane stack; canvasHeight counts
  // the ruler, which sits outside both scrollers.
  const laneStackHeight = canvasHeight - RULER_HEIGHT;
  const mountComplete =
    mountWindow.fromX <= VIEW_OFFSET_X &&
    mountWindow.toX   >= VIEW_OFFSET_X + VIEW_WIDTH &&
    mountWindow.fromY <= 0 &&
    mountWindow.toY   >= laneStackHeight;

  useEffect(() => {
    if (mountComplete) { return; }
    // One slice per frame: the JS thread hands this one over and the UI thread
    // gets to draw it and process touches before the next arrives.
    const frame = requestAnimationFrame(() => {
      setMountWindow((w) => ({
        day: w.day,
        fromX: clampToViewWindow(w.fromX - mountWidth),
        toX: clampToViewWindow(w.toX + mountWidth),
        fromY: w.fromY - mountHeight,
        toY: w.toY + mountHeight,
      }));
    });
    return () => cancelAnimationFrame(frame);
  }, [mountComplete, mountWindow, mountWidth, mountHeight]);

  // ── Scroll to a specific event (centered) ────────────────────────────────────
  // Fired both by the day-switcher "now" button and when navigating here from an
  // event (e.g. the artist detail). Deferred so it runs after the day-switch
  // restore (which may use a 50 ms timer on a fresh mount) and after the
  // ScrollView has measured its width.
  //
  // The signal carries a categoryId only when it means a specific event, so the
  // "now" button scrolls in time alone and leaves the lane the user is on.

  // Everything the deferred scroll needs about the lane stack, refreshed every
  // render: the timer can outlive the render that scheduled it. Arriving from
  // another tab, the lanes are still empty when the signal lands and only fill in
  // once useTimelineData has read the cache — a captured laneOffsets would be {}.
  const laneGeometryRef = useRef({ laneOffsets, laneHeights, stripHeight, areaHeight, bottomClearance });
  laneGeometryRef.current = { laneOffsets, laneHeights, stripHeight, areaHeight, bottomClearance };

  useEffect(() => {
    if (scrollToTimeSignal.counter === 0) { return; }
    if (scrollToTimeSignal.screenKey !== screenKey) { return; }
    const { fromMs, toMs, categoryId } = scrollToTimeSignal;
    const timer = setTimeout(() => {
      const day = selectedDayStartRef.current;
      // Content-space X (canvas is shifted left by VIEW_OFFSET_X).
      const centreX = timeToX((fromMs + toMs) / 2, day) - VIEW_OFFSET_X;
      const startX  = timeToX(fromMs, day) - VIEW_OFFSET_X;
      // Centre the event's midpoint, but never scroll so far that the start loses
      // its left padding (long events).
      const centredOffset = centreX - scrollViewWidthRef.current / 2;
      const targetX = Math.max(0, Math.min(centredOffset, startX - LEFT_PADDING_X));

      // Vertical: centre the event's lane in the space that is actually visible.
      // The ruler sits above this scroller, and on a short viewport the floating
      // BottomBar covers the bottom of it — centring on the raw height would park
      // the lane behind the bar. Left undefined when the lane is unknown (a "now"
      // jump, or a category hidden by the filter), and the offset then stands.
      const geometry = laneGeometryRef.current;
      const visibleHeight = Math.max(0, geometry.areaHeight - RULER_HEIGHT - geometry.bottomClearance);
      const laneTop = categoryId === undefined ? undefined : geometry.laneOffsets[categoryId];
      const laneSpan =
        categoryId === undefined ? 0 : geometry.stripHeight + (geometry.laneHeights[categoryId] ?? LANE_HEIGHT);
      const targetY =
        laneTop === undefined ? undefined : Math.max(0, laneTop + laneSpan / 2 - visibleHeight / 2);

      // A jump can land far outside the slice this day was mounted at, so widen
      // the window to cover where we are about to be. It only ever grows, so a
      // day that has already finished mounting is left alone.
      setMountWindow((w) => {
        const fromX = clampToViewWindow(Math.min(w.fromX, targetX + VIEW_OFFSET_X));
        const toX   = clampToViewWindow(Math.max(w.toX, targetX + VIEW_OFFSET_X + scrollViewWidthRef.current));
        const fromY = targetY === undefined ? w.fromY : Math.min(w.fromY, targetY);
        const toY   = targetY === undefined ? w.toY   : Math.max(w.toY, targetY + visibleHeight);
        if (fromX === w.fromX && toX === w.toX && fromY === w.fromY && toY === w.toY) { return w; }
        return { ...w, fromX, toX, fromY, toY };
      });
      scheduleOnUI(() => { scrollTo(horizontalScrollRef, targetX, 0, true); });
      if (targetY !== undefined) {
        verticalScrollRef.current?.scrollTo({ y: targetY, animated: true });
      }
    }, 120);
    return () => clearTimeout(timer);
  // selectedDayStart and the lane geometry are read via refs inside the timer —
  // the signal carries everything else it needs
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
      <ScrollView
        ref={verticalScrollRef}
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={100}
        onScroll={onVerticalScroll}
      >
        {/* Wrapper so the label overlay can sit beside the horizontal scroller:
            inside the vertical one (so it scrolls with the lanes) but outside the
            horizontal one (so horizontal scroll cannot move it). */}
        <View>
          {/* Lane-band backdrop. The strip and the events row are both
              transparent — that is what lets the titles show through them in
              landscape — so the colour they used to carry lives here instead.
              Sized to the lane stack rather than left to fill the wrapper: the
              wrapper also spans the canvas's bottom padding, which would tint the
              dead space under the last lane. */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: laneStackHeight,
              backgroundColor: colors.timeline.laneBg,
            }}
          />
          {/* Before the scroller, so the lanes paint over the titles. */}
          <LaneLabelOverlay
            categories={visibleCategories}
            laneOffsets={laneOffsets}
            laneHeights={laneHeights}
            overlayTitles={isShort}
          />
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
              {/* Full canvas shifted left so 09:30 aligns with x=0. The bottom
                  padding is the larger of two needs: clearing the floating
                  BottomBar, and keeping this — the horizontal scroller's content —
                  at least as tall as the viewport, so that a horizontal drag below
                  the last lane still pans the timeline on a day with few lanes. */}
              <View style={{ width: CANVAS_WIDTH, position: 'relative', transform: [{ translateX: -VIEW_OFFSET_X }], paddingBottom: Math.max(bottomClearance, areaHeight - canvasHeight)}}>
                {visibleCategories.map((cat) => {
                  const laneTop    = laneOffsets[cat.categoryId] ?? 0;
                  const laneBottom = laneTop + stripHeight + (laneHeights[cat.categoryId] ?? LANE_HEIGHT);
                  // A lane below the window ignores the X span, so feed it a
                  // constant one — its props then stop changing per step and its
                  // memo skips it outright.
                  const mountEvents = laneBottom >= mountWindow.fromY && laneTop <= mountWindow.toY;
                  return (
                    <CategoryLane
                      key={cat.categoryId}
                      category={cat}
                      events={eventsByCategory[cat.categoryId] ?? NO_LANE_EVENTS}
                      dayStart={selectedDayStart}
                      nowX={nowX}
                      getStatus={getStatus}
                      onBlockPress={onBlockPress}
                      labelRepeat={labelRepeat}
                      laneHeight={laneHeights[cat.categoryId]}
                      overlayTitles={isShort}
                      eventSubRows={categorySubRows?.[cat.categoryId]}
                      conflictOverlaps={conflictOverlaps}
                      mountEvents={mountEvents}
                      mountFromX={mountEvents ? mountWindow.fromX : 0}
                      mountToX={mountEvents ? mountWindow.toX : 0}
                    />
                  );
                })}
              </View>
            </View>
          </Animated.ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
