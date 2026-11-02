import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View, type LayoutChangeEvent, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
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
import { PlanGap } from './PlanGap';
import { PlanSpacer } from './PlanSpacer';
import { PlanFilterChip } from './filter/PlanFilterChip';
import { PlanDaySwitcher } from './PlanDaySwitcher';
import { planStrings } from './planStrings';
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
const strings = planStrings();

export function MyPlanScreen() {
  useTopBar({ title: strings.title, RightComponent: PlanFilterChip });
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
  const { close: closePanel } = usePlanPanel();
  const store = usePlanStore();
  const storeVersion = usePlanStoreVersion();
  const day = usePlanShownDay(festivalDays, now);
  const { openDetail } = useArtistDetail();
  const { openConflict } = useConflictDetail();
  const { bottomClearance } = useLayoutMode();

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
  const searchScope = useMemo(
    () => planSearchScope({ level, listable, clashing: conflicts.overlaps, setLevel, land: landOnSet }),
    [level, listable, conflicts.overlaps, setLevel, landOnSet],
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

  useEffect(() => {
    if (viewportHeight === 0 || day === 0) {
      return;
    }
    const request = store.takeLanding();
    if (request === null && landedDayRef.current === day) {
      return;
    }
    // A set (search) lands a third down, as now does, held within the list; a
    // set the day does not list falls back to the day's own landing.
    const setOffset = request?.kind === 'set' ? setScrollOffset(itemsRef.current, request.eventId, viewportHeight) : null;
    const target = setOffset !== null
      ? Math.min(setOffset, maxScrollOffset(itemsRef.current, viewportHeight, bottomClearanceRef.current))
      : landingOffset(itemsRef.current, day, request?.kind === 'now', viewportHeight, bottomClearanceRef.current);
    const animated = request !== null && landedDayRef.current === day;
    landedDayRef.current = day;
    // An animated scroll to now or to a set is the user's own request; that position may be kept.
    skipNextScrollRef.current = !animated;
    if (!animated) {
      scrollYRef.current = target;
    }
    listRef.current?.scrollToOffset({ offset: target, animated });
    if (setOffset !== null && request?.kind === 'set') {
      showLandingHighlight(request.eventId);
    }
  }, [day, viewportHeight, storeVersion, store]);

  // ── Landing: where a day's list starts, fixed for the life of that list ─────
  //
  // Read once per day, when its list is about to mount: a later minute or filter
  // change must not move the list (a changed contentOffset scrolls on iOS).
  // Before the first measurement there is no screen to aim at, so that list
  // starts from the top and the landing scroll above positions it, as it does on
  // web, which ignores contentOffset.
  const listDayRef = useRef<number | null>(null);
  const landingRef = useRef<{ offset: number; index: number; count: number } | null>(null);
  if (listDayRef.current !== day) {
    listDayRef.current = day;
    if (viewportHeight > 0) {
      const offset = landingOffset(items, day, false, viewportHeight, bottomClearance);
      landingRef.current = { offset, index: itemAtOffset(items, offset), count: itemsToFill(items, offset, viewportHeight) };
      scrollYRef.current = offset;
    } else {
      landingRef.current = null;
    }
  }
  const landing = landingRef.current;

  const handleLayout = useCallback((e: LayoutChangeEvent): void => {
    setViewportHeight(e.nativeEvent.layout.height);
  }, []);

  const persistScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (landedDayRef.current !== dayRef.current) {
      return;
    }
    setScroll(PLAN_SCREEN_KEY, dayRef.current, e.nativeEvent.contentOffset.y);
  }, []);

  // Saved while scrolling too: web wheel scrolling fires no drag/momentum events.
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    persistScroll(e);
  }, [persistScroll]);

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
            background={rowColors.get(item.event.categoryId)?.bg}
            border={rowColors.get(item.event.categoryId)?.border}
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
        content = <PlanEmpty item={item} />;
        break;
    }
    return <View style={{ height: item.height + PLAN_LAYOUT.itemSpacing }}>{content}</View>;
  }, [handleArtist, handleConflict, rowColors]);

  const getItemLayout = useCallback((_: ArrayLike<PlanItem> | null | undefined, index: number) => ({
    length: items[index].height + PLAN_LAYOUT.itemSpacing,
    offset: offsets[index],
    index,
  }), [items, offsets]);

  return (
    <View testID="plan-screen" style={{ flex: 1, backgroundColor: colors.background }} onLayout={handleLayout}>
      <FlatList
        key={day}
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
        onScroll={handleScroll}
        onScrollEndDrag={persistScroll}
        onMomentumScrollEnd={persistScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingTop: PLAN_LAYOUT.paddingTop, paddingBottom: PLAN_LAYOUT.paddingBottom + bottomClearance }}
      />
    </View>
  );
}
