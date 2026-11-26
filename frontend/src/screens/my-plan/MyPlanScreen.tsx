import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, View, type LayoutChangeEvent, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTopBar, useBottomBar, useFeedback } from '../../shell/ScreenUIContext';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useCategories, useFestivalDays, useStages } from '../../store/cacheStore';
import { decodeCategoryColor, categoryBlockColors } from '../../utils/color';
import { useDeferredInterests } from '../../features/interests/InterestContext';
import { useArtistDetail } from '../../features/artist-detail/ArtistDetailContext';
import { useConflictDetail } from '../../features/conflicts/ConflictDetailContext';
import { useConflicts } from '../../features/conflicts/ConflictContext';
import { usePlanFilters, usePlanPanel, usePlanShownDay, usePlanStore, usePlanStoreVersion } from './PlanContext';
import { minuteNow, useMinuteNow } from '../../hooks/useMinuteNow';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { usePullPastTop } from '../../ui/PullPreview';
import { usePinchSteps, type PinchFocal } from '../../ui/usePinchSteps';
import type { PinchDirection } from '../../ui/PinchStep.model';
import { pinchedLevel, pinchToast } from './filter/PlanPinch.model';
import { pinchAnchor, pinchScrollOffset, type PinchAnchor } from './planPinchAnchor';
import { PlanFilterSkeleton } from './filter/PlanFilterSkeleton';
import { getScroll, setScroll } from '../../store/uiStatePersistence';
import { buildPlanDay, itemAtOffset, itemOffsets, itemsToFill, maxScrollOffset, nowScrollOffset, PLAN_LAYOUT, planNowInView, planNowView, setScrollOffset, type PlanItem } from './planUtils';
import { registerPlanNowProbe } from './planNowProbe';
import { festivalToday, getFestivalDayStart } from '../../utils/festivalTime';
import { planPicks } from '../../lib/plan';
import { useSearchScope } from '../../features/search/SearchContext';
import { showLandingHighlight } from '../../features/timeline/landingHighlight';
import { planSearchScope } from './planSearchScope';
import { PlanSetRow } from './PlanSetRow';
import { PlanCap } from './PlanCap';
import { PlanEmpty } from './PlanEmpty';
import type { PlanEmptyAction } from './PlanEmpty.model';
import { navigationRef } from '../../navigation/navigationRef';
import { PlanGap } from './PlanGap';
import { PlanSpacer } from './PlanSpacer';
import { PlanFilterChip } from './filter/PlanFilterChip';
import { PlanDaySwitcher } from './PlanDaySwitcher';
import { PLAN_TIMELINE_SCREEN_KEY, PlanTimeline } from './landscape/PlanTimeline';
import { planTimelineRule } from './landscape/PlanTimeline.model';
import { planListOffsetAt, planListTime } from './planTimeCurve';
import { useTimelineFilter } from '../timeline/TimelineFilterContext';
import { strings } from '../../i18n/strings';
import type { DbArtist, DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── My plan ───────────────────────────────────────────────────────────────────
//
// Today, now and next, one festival day at a time. The list's content comes from
// buildPlanDay, with deterministic heights, so the FlatList needs no measuring
// (getItemLayout) and scroll targets are computed. Spec: app/docs/frontend/design/my-plan.md.
//
// A FlatList, not a ScrollView rendering every item: it scrolled faster on
// phones, a high-end one included. The cost is a second commit after every
// change: its cell-window check fires 50 ms after each update and commits the
// list again, unchanged. Each element still renders again only when what it
// shows changes, so that commit re-renders none of them.
//
// A day is mounted the way the timeline mounts one: once the screen's height is
// known, each day gets a list of its own (keyed by the day) that starts at its
// landing spot and draws about one screen of cells from there, the rest
// following one screenful per batch. A day switch then creates only the views
// about to be seen, where they will be seen; mounting the whole day, or its top
// first, is what made switching visibly slow on phones.
//
// Scrolling works like the timeline's: the position is remembered per day
// (uiStatePersistence, under PLAN_SCREEN_KEY, as y offsets); a day without one
// lands with "now" a third from the top if it is today, else at the top; and a
// "now" request (the pill, or today's day button tapped again) scrolls to now,
// and a set request (search) scrolls to that set's row and lights it.
// Every landing is held within what the list can scroll (landingOffset): a
// position saved under a longer filter, or now on the end cap, can be past the
// end, and a list started there draws only the cells it thinks are in view.
// Once now is in view, the pill switches to the timeline instead, so the screen
// answers where it is scrolled (registerPlanNowProbe).
//
// A pinch on the list steps the filter while it goes, like a zoom
// (filter/PlanPinch.model, ui/usePinchSteps): in toward Must-see only, out
// toward All sets, with a toast naming the filter now on, centred above the
// bottom bar, also at an end where nothing changed, so the pinch is seen to count. Each
// step that changes the filter keeps its place (planPinchAnchor): the set row
// under the pinch keeps its height on screen, or the sets around it, if the new
// filter drops it, are centred where it was. The list then starts again there,
// as a day does at its landing spot, and that position is the day's saved one.
//
// A phone turned to landscape shows the day as a timeline instead
// (landscape/PlanTimeline), with only the lanes holding a set the list shows
// under the current filter. The list is unmounted meanwhile. A roomy screen
// (isWide: a tablet, a desktop window) keeps the list in either orientation.
// Turning keeps the screen's time (see "The screen's time" below): one time
// per day, the time curve at the list's middle line (planTimeCurve) and the
// time at the timeline's centre line; both land on it, and only a landing on a
// new day, a request, a pinch or the user's own scroll changes it. In landscape, now and set requests (today's day button
// tapped again, search) scroll the timeline, as on the Program.

const PLAN_SCREEN_KEY = 'plan';

const keyOf = (item: PlanItem): string => item.key;

/**
 * Where a day lands: now when asked for, else its saved position, else now,
 * else the top; held within what the list can scroll.
 */
function landingOffset(
  items: PlanItem[],
  day: number,
  nowRequested: boolean,
  viewportHeight: number,
  bottomClearance: number,
): number {
  const nowOffset = nowScrollOffset(items, viewportHeight);
  const wanted = nowRequested ? (nowOffset ?? 0) : (getScroll(PLAN_SCREEN_KEY, day) ?? nowOffset ?? 0);
  return Math.min(wanted, maxScrollOffset(items, viewportHeight, bottomClearance));
}

/** Cells per batch before the screen is measured: FlatList's own default. */
const DEFAULT_CELL_BATCH = 10;

export function MyPlanScreen() {
  useTopBar({ title: strings().screens.myPlan, RightComponent: PlanFilterChip });
  useBottomBar({ ContentComponent: PlanDaySwitcher });

  const slug = useSelectedSlug();
  // Deferred, as the conflicts and the now pill read them: a pick from the
  // artist sheet commits its star first, and the list follows.
  const interests = useDeferredInterests();
  // The app's one conflict calculation, for the same deferred picks: the list's
  // clash marks and its conflicts-only filter follow it, never a run of their own.
  const conflicts = useConflicts();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const festivalDays = useFestivalDays(slug);
  const categories = useCategories(slug);
  // A row's background and border are its category's, as on the timeline.
  const rowColors = useMemo(
    () => new Map(categories.map((c) => [c.categoryId, categoryBlockColors(decodeCategoryColor(c.color))])),
    [categories],
  );
  const now = useMinuteNow();
  const { level, setLevel } = usePlanFilters();
  const { open: openPanel, close: closePanel } = usePlanPanel();
  const store = usePlanStore();
  const storeVersion = usePlanStoreVersion();
  const day = usePlanShownDay(festivalDays, now);
  const { openDetail } = useArtistDetail();
  const { openConflict } = useConflictDetail();
  const { bottomClearance, isWide, width, height } = useLayoutMode();
  const landscape = !isWide && width > height;
  const { requestScrollToNow, requestScrollToTime } = useTimelineFilter();

  const duringFestival = festivalToday(festivalDays, now) !== null;
  const items = useMemo<PlanItem[]>(
    () => (day === 0 ? [] : buildPlanDay(interests, { artists, stages, artistEvents }, conflicts, { dayStart: day, now, duringFestival, level })),
    [day, interests, artists, stages, artistEvents, conflicts, now, duringFestival, level],
  );
  const offsets = useMemo(() => itemOffsets(items), [items]);

  // What My plan tells search (planSearchScope): every set any filter can list,
  // by the rule the list and the conflicts share, and the same clashes.
  const listable = useMemo(
    () => new Map(planPicks(interests, { artists, artistEvents }, true).map((p) => [p.event.eventId, p.level])),
    [interests, artists, artistEvents],
  );
  const landOnSet = useCallback((event: DbEvent): void => {
    store.requestSet(getFestivalDayStart(event.dateFrom), event.eventId, minuteNow());
  }, [store]);
  // In landscape, by what the timeline shows (PlanTimeline.model).
  const timelineRule = useMemo(
    () => (landscape ? planTimelineRule(interests, Object.values(artistEvents).flat(), artists) : undefined),
    [landscape, interests, artistEvents, artists],
  );
  const searchScope = useMemo(
    () => planSearchScope({ level, listable, clashing: conflicts.overlaps, timeline: timelineRule, setLevel, land: landOnSet }),
    [level, listable, conflicts.overlaps, timelineRule, setLevel, landOnSet],
  );
  useSearchScope(searchScope);

  // The filter panel belongs to this screen: leaving it closes the panel.
  useFocusEffect(useCallback(() => () => { closePanel(); }, [closePanel]));

  const handleArtist = useCallback((artist: DbArtist): void => {
    openDetail(artist, 'collapsed');
  }, [openDetail]);

  const handleConflict = useCallback((event: DbEvent): void => {
    openConflict(event);
  }, [openConflict]);

  // The empty day's links: the artist list, or the filter panel (which picks no filter itself).
  const handleEmptyAction = useCallback((action: PlanEmptyAction): void => {
    if (action === 'artists') {
      navigationRef.navigate('ArtistList');
    } else {
      openPanel();
    }
  }, [openPanel]);

  // ── Scroll: landing, "now" requests, per-day memory ────────────────────────

  const listRef = useRef<FlatList<PlanItem>>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  // Read when landing, not a reason to land again: a new minute or a filter
  // change must not move a list the user has scrolled.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const bottomClearanceRef = useRef(bottomClearance);
  bottomClearanceRef.current = bottomClearance;
  // The day the list has been positioned for. Scroll events are saved only for
  // it: while a day switch swaps the content, the list still reports offsets of
  // the old day's content, clamped to the new one's.
  const landedDayRef = useRef<number | null>(null);
  const dayRef = useRef(day);
  dayRef.current = day;
  // The screen's own landing scroll must not be remembered as the user's: the
  // landing for today is "now", which moves, and a stored copy would pin a day
  // the user never scrolled to the "now" of an earlier visit. A non-animated
  // scrollToOffset reports exactly one scroll event, which this skips.
  const skipNextScrollRef = useRef(false);
  // Where the list is scrolled, for the now probe: every scroll event, and the
  // landing offsets, which native may apply without one.
  const scrollYRef = useRef(0);

  // ── The screen's time: what the list and the landscape timeline show ──────
  //
  // One time per shown day, kept here: on the list it is the time curve at the
  // middle line (planTimeCurve), on the landscape timeline the time at its
  // centre line. Both land on it. It is taken anew only from:
  //   - a landing of the screen's own on a day it keeps no time for (where the
  //     day opens: its saved position, now, or the top);
  //   - a request (now, a set) or a pinch's landing, at their target;
  //   - the end of the user's own scroll (web: any scroll not the list's own).
  // A landing on the kept time never reads it back, so turning without
  // scrolling shows the same time every time, even where a view is held at its
  // top or end. The list lands on it again each time its height changes: while
  // the phone turns, the screen is laid out at passing sizes before its own.
  // Its height is measured again when it comes back (cleared on the turn), so
  // it mounts from the top and is scrolled to the time, never placed at a mount
  // offset worked out from a stale height; the scroll also tells the list which
  // rows to draw there.
  const planTimeRef = useRef<{ day: number; timeMs: number } | null>(null);
  const keptTime = (forDay: number): number | null => (planTimeRef.current?.day === forDay ? planTimeRef.current.timeMs : null);
  const keepTime = useCallback((forDay: number, timeMs: number | null): void => {
    if (timeMs !== null) {
      planTimeRef.current = { day: forDay, timeMs };
    }
  }, []);
  const viewportHeightRef = useRef(viewportHeight);
  viewportHeightRef.current = viewportHeight;
  /** The list's time scrolled to `scrollY`, on the shown day, at its measured height. */
  const listTimeAt = useCallback((scrollY: number): number | null => planListTime(itemsRef.current, dayRef.current, {
    scrollY,
    viewportHeight: viewportHeightRef.current,
    bottomInset: bottomClearanceRef.current,
  }), []);

  const shownLandscapeRef = useRef(landscape);
  if (shownLandscapeRef.current !== landscape) {
    shownLandscapeRef.current = landscape;
    if (landscape) {
      setViewportHeight(0);
    }
  }
  // The landscape timeline's own landings, requests and the user's scrolls there.
  const handleTimelineTime = useCallback((timeMs: number, dayStart: number): void => {
    keepTime(dayStart, timeMs);
  }, [keepTime]);

  const artistEventsRef = useRef(artistEvents);
  artistEventsRef.current = artistEvents;

  useEffect(() => {
    if (day === 0) {
      return;
    }
    if (landscape) {
      // The timeline takes the requests: now scrolls it to now, a set to its block.
      const request = store.takeLanding();
      if (request?.kind === 'now') {
        requestScrollToNow(PLAN_TIMELINE_SCREEN_KEY);
      } else if (request?.kind === 'set') {
        const event = Object.values(artistEventsRef.current).flat().find((e) => e.eventId === request.eventId);
        if (event !== undefined) {
          requestScrollToTime(PLAN_TIMELINE_SCREEN_KEY, event.dateFrom, event.dateTo, event.categoryId, event.eventId);
        }
      }
      return;
    }
    if (viewportHeight === 0) {
      return;
    }
    const request = store.takeLanding();
    const kept = keptTime(day);
    // Landed already, nothing asked, no time to keep: the list stays.
    if (request === null && kept === null && landedDayRef.current === day) {
      return;
    }
    const items = itemsRef.current;
    const clearance = bottomClearanceRef.current;
    // A set (search) lands a third down, as now does, held within the list; a
    // set the day does not list falls back to the day's own landing.
    const setOffset = request?.kind === 'set' ? setScrollOffset(items, request.eventId, viewportHeight) : null;
    let target: number;
    if (setOffset !== null) {
      target = Math.min(setOffset, maxScrollOffset(items, viewportHeight, clearance));
    } else if (request === null && kept !== null) {
      target = planListOffsetAt(items, day, kept, { viewportHeight, bottomInset: clearance }) ?? landingOffset(items, day, false, viewportHeight, clearance);
    } else {
      target = landingOffset(items, day, request?.kind === 'now', viewportHeight, clearance);
    }
    const animated = request !== null && landedDayRef.current === day;
    landedDayRef.current = day;
    // An animated scroll to now or to a set is the user's own request; that position may be kept.
    skipNextScrollRef.current = !animated;
    if (!animated) {
      scrollYRef.current = target;
    }
    if (request !== null || kept === null) {
      // Where the day opens, or a request's target: the time now.
      keepTime(day, planListTime(items, day, { scrollY: target, viewportHeight, bottomInset: clearance }));
    } else {
      // On the kept time: the day's position from now on, the time not read back.
      setScroll(PLAN_SCREEN_KEY, day, target);
    }
    listRef.current?.scrollToOffset({ offset: target, animated });
    if (setOffset !== null && request?.kind === 'set') {
      showLandingHighlight(request.eventId);
    }
    // keptTime reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, viewportHeight, storeVersion, store, landscape, requestScrollToNow, requestScrollToTime, keepTime]);

  // ── Landing: where a day's list starts, fixed for the life of that list ─────
  //
  // Read once per day, when its list is about to mount: a later minute or filter
  // change must not move the list (a changed contentOffset scrolls on iOS).
  // Before the first measurement there is no screen to aim at, so that list
  // starts from the top and the landing scroll above positions it, as it does on
  // web, which ignores contentOffset.
  //
  // A pinch that changes the filter starts a list of its own too (pinchCount in
  // its key), landing where the pinch keeps its place.
  const [pinchCount, setPinchCount] = useState(0);
  const pendingPinchRef = useRef<{ count: number; day: number; anchor: PinchAnchor } | null>(null);
  // Turned back from landscape, the list mounts again, at the kept time.
  const listKey = `${day}:${pinchCount}:${landscape ? 'timeline' : 'list'}`;
  const listKeyRef = useRef<string | null>(null);
  const landingRef = useRef<{ offset: number; index: number; count: number } | null>(null);
  if (listKeyRef.current !== listKey) {
    listKeyRef.current = listKey;
    if (viewportHeight > 0 && !landscape) {
      const pinched = pendingPinchRef.current;
      const pinchOffset = pinched !== null && pinched.count === pinchCount && pinched.day === day
        ? pinchScrollOffset(pinched.anchor, items, viewportHeight, bottomClearance)
        : null;
      const kept = keptTime(day);
      const keptOffset = kept === null ? null : planListOffsetAt(items, day, kept, { viewportHeight, bottomInset: bottomClearance });
      const offset = pinchOffset
        ?? keptOffset
        ?? landingOffset(items, day, false, viewportHeight, bottomClearance);
      landingRef.current = { offset, index: itemAtOffset(items, offset), count: itemsToFill(items, offset, viewportHeight) };
      scrollYRef.current = offset;
    } else {
      landingRef.current = null;
    }
  }
  const landing = landingRef.current;

  // A phone's list is taller than wide: a wider frame is one passing by while
  // the phone turns, not the list's own size.
  const isWideRef = useRef(isWide);
  isWideRef.current = isWide;
  const handleLayout = useCallback((e: LayoutChangeEvent): void => {
    const { width: layoutWidth, height: layoutHeight } = e.nativeEvent.layout;
    if (!isWideRef.current && layoutWidth > layoutHeight) {
      return;
    }
    setViewportHeight(layoutHeight);
  }, []);

  const persistScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (landedDayRef.current !== dayRef.current) {
      return;
    }
    setScroll(PLAN_SCREEN_KEY, dayRef.current, e.nativeEvent.contentOffset.y);
  }, []);

  // The end of the user's own scroll: its position saved, and the time there kept.
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    persistScroll(e);
    if (landedDayRef.current === dayRef.current) {
      keepTime(dayRef.current, listTimeAt(e.nativeEvent.contentOffset.y));
    }
  }, [persistScroll, keepTime, listTimeAt]);

  // Saved while scrolling too: web wheel scrolling fires no drag/momentum
  // events, so there a scroll not the list's own also sets the time.
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    if (Platform.OS === 'web') {
      handleScrollEnd(e);
    } else {
      persistScroll(e);
    }
  }, [persistScroll, handleScrollEnd]);

  // ── Pinch: filter steps while it goes, each keeping its place ───────────────
  const showFeedback = useFeedback();
  const handlePinch = useCallback((direction: PinchDirection, focal: PinchFocal): void => {
    const next = pinchedLevel(level, direction);
    if (next !== level && viewportHeight > 0) {
      // The list fills the screen from its top, so the pinch's centre is on the list too.
      const anchor = pinchAnchor(itemsRef.current, scrollYRef.current, focal.y);
      if (anchor !== null) {
        pendingPinchRef.current = { count: pinchCount + 1, day, anchor };
        setPinchCount(pinchCount + 1);
      }
    }
    setLevel(next);
    showFeedback(pinchToast(next), 'confirmation', { anchor: { kind: 'bottom' } });
  }, [level, setLevel, showFeedback, viewportHeight, pinchCount, day]);
  const pinch = usePinchSteps(handlePinch, 'plan-pinch');

  // The new list's landing, where native placed it already (contentOffset):
  // scrolled to on web, which ignores that, and saved as the day's position.
  useEffect(() => {
    const pinched = pendingPinchRef.current;
    if (pinched === null || pinched.count !== pinchCount) {
      return;
    }
    pendingPinchRef.current = null;
    const target = landingRef.current?.offset;
    if (target === undefined) {
      return;
    }
    scrollYRef.current = target;
    setScroll(PLAN_SCREEN_KEY, pinched.day, target);
    // The pinch's landing is the time now.
    keepTime(pinched.day, listTimeAt(target));
    listRef.current?.scrollToOffset({ offset: target, animated: false });
  }, [pinchCount, keepTime, listTimeAt]);

  // A pull down past the list's top opens the filter panel, as its chip does
  // (switched off for now: ui/PullPreview.model › PULL_PAST_TOP_ENABLED).
  const { scrollProps, preview } = usePullPastTop(openPanel, {
    onScroll: handleScroll,
    onScrollEndDrag: handleScrollEnd,
    scrollEventThrottle: 100,
  }, PlanFilterSkeleton);

  // ── Is now in view here? ───────────────────────────────────────────────────
  // Asked by the now pill at the tap: it switches to the timeline when the now
  // arrow is in the central 80 % of the list above the floating bottom bar, or
  // when a scroll to now would not move the list. Read from refs at that
  // moment, so scrolling re-renders nothing.
  const probeInputsRef = useRef({ viewportHeight, bottomClearance });
  probeInputsRef.current = { viewportHeight, bottomClearance };
  useEffect(() => registerPlanNowProbe(() => planNowInView(planNowView(itemsRef.current, {
    scrollY: scrollYRef.current,
    viewportHeight: probeInputsRef.current.viewportHeight,
    bottomInset: probeInputsRef.current.bottomClearance,
  }))), []);

  // ── Rows ────────────────────────────────────────────────────────────────────

  const renderItem = useCallback<ListRenderItem<PlanItem>>(({ item }) => {
    let content: React.ReactNode = null;
    switch (item.kind) {
      case 'set':
        content = (
          <PlanSetRow
            item={item}
            onPressArtist={handleArtist}
            category={rowColors.get(item.event.categoryId)}
          />
        );
        break;
      case 'gap':
        content = <PlanGap item={item} onPressConflict={handleConflict} />;
        break;
      case 'cap':
        content = <PlanCap item={item} onPressConflict={handleConflict} />;
        break;
      case 'spacer':
        content = <PlanSpacer item={item} onPressConflict={handleConflict} />;
        break;
      case 'empty':
        content = <PlanEmpty item={item} onAction={handleEmptyAction} />;
        break;
    }
    return <View style={{ height: item.height + PLAN_LAYOUT.itemSpacing }}>{content}</View>;
  }, [handleArtist, handleConflict, handleEmptyAction, rowColors]);

  const getItemLayout = useCallback((_: ArrayLike<PlanItem> | null | undefined, index: number) => ({
    length: items[index].height + PLAN_LAYOUT.itemSpacing,
    offset: offsets[index],
    index,
  }), [items, offsets]);

  if (landscape) {
    return (
      <View testID="plan-screen" style={{ flex: 1, backgroundColor: colors.background }}>
        <PlanTimeline
          day={day}
          level={level}
          onPullPastTop={openPanel}
          landingCentreMs={keptTime(day) ?? undefined}
          onCentreTime={handleTimelineTime}
        />
      </View>
    );
  }

  return (
    <GestureDetector gesture={pinch}>
      <View testID="plan-screen" style={{ flex: 1, backgroundColor: colors.background }} onLayout={handleLayout}>
        <FlatList
          key={listKey}
          testID="plan-list"
          ref={listRef}
          data={items}
          contentOffset={landing !== null ? { x: 0, y: landing.offset } : undefined}
          initialScrollIndex={landing !== null && landing.index > 0 ? landing.index : undefined}
          initialNumToRender={landing?.count ?? DEFAULT_CELL_BATCH}
          maxToRenderPerBatch={landing?.count ?? DEFAULT_CELL_BATCH}
          keyExtractor={keyOf}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          {...scrollProps}
          onMomentumScrollEnd={handleScrollEnd}
          contentContainerStyle={{ paddingTop: PLAN_LAYOUT.paddingTop, paddingBottom: PLAN_LAYOUT.paddingBottom + bottomClearance }}
        />
        {preview}
      </View>
    </GestureDetector>
  );
}
