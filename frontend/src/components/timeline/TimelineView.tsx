import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useFocusEffect } from '@react-navigation/native';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useNowX } from '../../hooks/useNowX';
import { getScroll, setScroll } from '../../store/uiStatePersistence';
import { CategoryLane } from './CategoryLane';
import type { TimelineDayModel } from './TimelineDay.model';
import { TimeRuler } from './TimeRuler';
import { LaneLabelOverlay } from './LaneLabelOverlay';
import {
  CANVAS_WIDTH,
  RULER_HEIGHT,
  VIEW_OFFSET_X,
  VIEW_WIDTH,
  labelRepeatPx,
  defaultScrollX,
  eventScrollTarget,
} from './timelineLayout';
import { colors } from '../../styling/tokens';
import { perfMark, perfMarksEnabled } from '../../utils/perfMarks';
import type { DbArtist, DbEvent } from '../../types/backend';

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
  /** The shown day's lanes, titles and geometry (TimelineDay.model.ts). */
  day: TimelineDayModel;
  selectedDayStart: number;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
};

export function TimelineView({ screenKey, day, selectedDayStart, onBlockPress }: Props) {
  const { lanes, titles, tops, canvasHeight, firstEventMs } = day;
  const [areaHeight, setAreaHeight] = useState(0);
  // The same measurement in two forms: a ref for the scroll-to-event centring,
  // which reads it imperatively, and state for the label spacing, which has to
  // re-render the lanes when the viewport resizes.
  const scrollViewWidthRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const { scrollToTimeSignal } = useTimelineFilter();
  const { bottomClearance } = useLayoutMode();

  // ── Default landing position ────────────────────────────────────────────────

  // The day lands at its earliest set *as this screen shows it* (the day's
  // model), so the support timeline aims at its own first set, not the main
  // stage's.

  // Read imperatively by the persist guard, which must keep a stable identity —
  // it feeds useAnimatedScrollHandler's dependency list.
  const firstEventMsRef = useRef(firstEventMs);
  firstEventMsRef.current = firstEventMs;

  // Where a day opens: the persisted offset if the user ever scrolled it, else
  // derived from that day's first event.
  const landingX = useCallback((day: number): number => {
    return getScroll(screenKey, day) ?? defaultScrollX(firstEventMsRef.current, day);
  }, [screenKey]);

  // ── Horizontal scroll tracking ──────────────────────────────────────────────

  // Every imperative scroll below is issued from JS, so a plain ref and the
  // ScrollView's own scrollTo are all it takes. Reanimated's scrollTo() worklet
  // is for scrolling from the UI thread, inside a gesture or animation — routing
  // a JS call through it bought nothing.
  const horizontalScrollRef = useRef<Animated.ScrollView>(null);

  // Captured once, for the very first day this view shows. It is handed to the
  // ScrollView as `contentOffset`, which iOS re-applies whenever the prop changes
  // — so it must never change again, or a later render would yank the view out
  // from under the user. Day switches scroll imperatively instead.
  const mountOffsetRef = useRef<number | null>(null);
  if (mountOffsetRef.current === null) {
    mountOffsetRef.current = landingX(selectedDayStart);
  }
  const mountOffset = mountOffsetRef.current;
  const mountContentOffset = useRef({ x: mountOffset, y: 0 }).current;

  // Seeded to the same offset the view mounts at: TimeRuler positions itself from
  // scrollX, so a zero here would draw the ruler out of step with the lanes until
  // the first scroll event — and any position persisted before then would record a
  // place the user was never at.
  const scrollX = useSharedValue(mountOffset);
  const lastPersist = useSharedValue(0);

  const selectedDayStartRef = useRef(selectedDayStart);
  useEffect(() => { selectedDayStartRef.current = selectedDayStart; }, [selectedDayStart]);

  // Persist the settled scroll offset for the current day. Called on JS thread
  // from the scroll-gesture-end worklets, so it reads the current day from a ref.
  const persistCurrentScroll = useCallback((x: number): void => {
    if (selectedDayStartRef.current === 0) { return; }
    // A day with nothing on it has no position worth remembering, and the one it
    // would store is exactly the left-edge fallback — which would then outrank the
    // derived default once the day does have events (lens switched back to "all",
    // say), pinning it to 08:30 for good.
    if (firstEventMsRef.current === undefined) { return; }
    setScroll(screenKey, selectedDayStartRef.current, x);
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

  // Imperative handle for the scroll-to-event jump below.
  const verticalScrollRef = useRef<ScrollViewInstance>(null);

  // ── Now-line position ────────────────────────────────────────────────────────
  // Shared with every NowLine and consumed on the UI thread; it follows the
  // minute clock without re-rendering anything (useNowX).

  const nowX = useNowX(selectedDayStart);

  // ── Scroll save / restore on day switch ────────────────────────────────────

  const prevDayRef = useRef(0);

  useEffect(() => {
    if (selectedDayStart === 0) { return; }

    const prevDay = prevDayRef.current;
    if (prevDay !== 0 && prevDay !== selectedDayStart) {
      setScroll(screenKey, prevDay, scrollX.value);
    }
    prevDayRef.current = selectedDayStart;

    const savedX = landingX(selectedDayStart);

    if (prevDay === 0) {
      // The first day is already mounted at this offset via `contentOffset`, which
      // both native platforms honour. This is the web fallback (react-native-web
      // ignores the prop), and on native a no-op — or a correction, should iOS have
      // clamped the mount offset against a content size it did not have yet.
      const timer = setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({ x: savedX, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }

    horizontalScrollRef.current?.scrollTo({ x: savedX, animated: false });
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
    const anchorX = landingX(selectedDayStart) + VIEW_OFFSET_X;
    const anchorY = scrollYRef.current;
    setMountWindow({
      day: selectedDayStart,
      fromX: clampToViewWindow(anchorX),
      toX: clampToViewWindow(anchorX + mountWidth),
      fromY: anchorY,
      toY: anchorY + mountHeight,
    });
  }

  // Lane tops are measured from the top of the lane stack; canvasHeight counts
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

  // The end of a day's mount, a frame after the last slice so the timestamp is
  // paint rather than the state change. Perf builds only: the device runner
  // times it from DaySwitcher's `day:select`.
  useEffect(() => {
    if (!perfMarksEnabled() || !mountComplete) { return; }
    const frame = requestAnimationFrame(() => { perfMark('timeline:mounted'); });
    return () => cancelAnimationFrame(frame);
  }, [mountComplete]);

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
  // once useTimelineData has read the cache — captured lane tops would be empty.
  const laneGeometryRef = useRef({ lanes, tops, areaHeight, bottomClearance });
  laneGeometryRef.current = { lanes, tops, areaHeight, bottomClearance };

  useEffect(() => {
    if (scrollToTimeSignal.counter === 0) { return; }
    if (scrollToTimeSignal.screenKey !== screenKey) { return; }
    const { fromMs, toMs, categoryId } = scrollToTimeSignal;
    const timer = setTimeout(() => {
      // The lane is unknown for a "now" jump, or when the category is hidden by
      // the filter; the vertical offset then stands.
      const geometry = laneGeometryRef.current;
      let lane: { top: number; span: number } | undefined;
      const target = geometry.lanes.find((l) => l.key === categoryId);
      if (target !== undefined) {
        lane = { top: geometry.tops[target.key], span: target.stripHeight + target.height };
      }
      const { x: targetX, y: targetY, visibleHeight } = eventScrollTarget({
        fromMs,
        toMs,
        dayStartMs: selectedDayStartRef.current,
        viewportWidth: scrollViewWidthRef.current,
        lane,
        areaHeight: geometry.areaHeight,
        bottomClearance: geometry.bottomClearance,
      });

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
      horizontalScrollRef.current?.scrollTo({ x: targetX, animated: true });
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
      // Routed through persistCurrentScroll rather than calling setScroll directly,
      // so leaving a day with nothing on it inherits the same guard.
      return () => { persistCurrentScroll(scrollX.value); };
    }, [scrollX, persistCurrentScroll]),
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const labelRepeat = labelRepeatPx(viewportWidth);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { setAreaHeight(e.nativeEvent.layout.height); }}>
      <TimeRuler dayStart={selectedDayStart} scrollX={scrollX} nowX={nowX} />
      <ScrollView
        ref={verticalScrollRef}
        // Stable handles for E2E position checks; an attribute, not a view.
        testID="timeline-scroll-y"
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
          <LaneLabelOverlay titles={titles} />
          <Animated.ScrollView
            ref={horizontalScrollRef}
            testID="timeline-scroll-x"
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            // Mounts already at the day's landing position instead of scrolling
            // there afterwards, so there is no window in which the view, scrollX
            // and the mount anchor disagree. Ignored by react-native-web; the
            // restore effect's first-mount branch covers that.
            contentOffset={mountContentOffset}
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
                {lanes.map((lane) => {
                  const laneTop    = tops[lane.key];
                  const laneBottom = laneTop + lane.stripHeight + lane.height;
                  // A lane below the window ignores the X span, so feed it a
                  // constant one — its props then stop changing per step and its
                  // memo skips it outright.
                  const mountEvents = laneBottom >= mountWindow.fromY && laneTop <= mountWindow.toY;
                  return (
                    <CategoryLane
                      key={lane.key}
                      item={lane}
                      dayStart={selectedDayStart}
                      nowX={nowX}
                      onBlockPress={onBlockPress}
                      labelRepeat={labelRepeat}
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
