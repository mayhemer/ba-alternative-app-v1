import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View, type LayoutChangeEvent, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useSelectedSlug } from '../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../store/cacheStore';
import { useInterest } from '../context/InterestContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { usePlanFilters, usePlanPanel, usePlanShownDay, usePlanStore, usePlanStoreVersion } from '../context/PlanContext';
import { useMinuteNow } from '../hooks/useMinuteNow';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { getScroll, setScroll } from '../store/uiStatePersistence';
import { buildPlanDay, itemOffsets, nowScrollOffset, PLAN_LAYOUT, type PlanItem } from '../utils/planUtils';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import { PlanSetRow } from '../components/plan/PlanSetRow';
import { ConflictGroupTitle, NowArrow, PlanCap, PlanDayTitle, PlanEmpty, PlanGap, type DayTone } from '../components/plan/PlanListItems';
import { PlanFilterChip } from '../components/plan/PlanFilterChip';
import { PlanDaySwitcher } from '../components/plan/PlanDaySwitcher';
import { LIST_GUTTER } from '../components/plan/planStyles';
import { planStrings } from '../components/plan/planStrings';
import type { DbArtist, DbEvent } from '../types/backend';
import { colors } from '../styling/tokens';

// ── My plan ───────────────────────────────────────────────────────────────────
//
// Today, now and next, one festival day at a time. The list's content comes from
// buildPlanDay, with deterministic heights, so the FlatList needs no measuring
// and scroll targets are computed. Spec: app/MY-PLAN-VIEW-DESIGN.md.
//
// Scrolling works like the timeline's: the position is remembered per day
// (uiStatePersistence, under PLAN_SCREEN_KEY, as y offsets); a day without one
// lands with "now" a third from the top if it is today, else at the top; and a
// "now" request (the pill, or today's day button tapped again) scrolls to now.

const PLAN_SCREEN_KEY = 'plan';
const strings = planStrings();

function dayTone(day: number, now: number, festivalDays: number[]): DayTone {
  const today = getFestivalDayStart(now);
  if (!festivalDays.includes(today)) { return 'outside'; }
  if (day === today) { return 'today'; }
  return day < today ? 'past' : 'future';
}

export function MyPlanScreen() {
  useTopBar({ title: strings.title, RightComponent: PlanFilterChip });
  useBottomBar({ ContentComponent: PlanDaySwitcher });

  const slug = useSelectedSlug();
  const { interests } = useInterest();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();
  const { showMaybe, conflictsOnly } = usePlanFilters();
  const { close: closePanel } = usePlanPanel();
  const store = usePlanStore();
  const storeVersion = usePlanStoreVersion();
  const day = usePlanShownDay(festivalDays, now);
  const { openDetail } = useArtistDetail();
  const { openConflict } = useConflictDetail();
  const { bottomClearance } = useLayoutMode();

  const tone = dayTone(day, now, festivalDays);
  const duringFestival = tone !== 'outside';
  const items = useMemo<PlanItem[]>(
    () => (day === 0 ? [] : buildPlanDay(interests, { artists, stages, artistEvents }, { dayStart: day, now, duringFestival, showMaybe, conflictsOnly })),
    [day, interests, artists, stages, artistEvents, now, duringFestival, showMaybe, conflictsOnly],
  );
  const offsets = useMemo(() => itemOffsets(items), [items]);

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

  useEffect(() => {
    if (viewportHeight === 0 || day === 0) {
      return;
    }
    const nowRequested = store.takeNowRequest();
    if (!nowRequested && landedDayRef.current === day) {
      return;
    }
    const nowOffset = nowScrollOffset(itemsRef.current, viewportHeight);
    const target = nowRequested ? (nowOffset ?? 0) : (getScroll(PLAN_SCREEN_KEY, day) ?? nowOffset ?? 0);
    const animated = nowRequested && landedDayRef.current === day;
    landedDayRef.current = day;
    // An animated scroll to now is the user's own request; that position may be kept.
    skipNextScrollRef.current = !animated;
    listRef.current?.scrollToOffset({ offset: target, animated });
  }, [day, viewportHeight, storeVersion, store]);

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
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    persistScroll(e);
  }, [persistScroll]);

  // ── Rows ────────────────────────────────────────────────────────────────────

  const renderItem = useCallback<ListRenderItem<PlanItem>>(({ item, index }) => {
    const next = items[index + 1];
    // The conflict title is drawn by the cell above its group (gap, cap or spacer):
    // a cell cannot take touches outside its own bounds on Android.
    let title: React.ReactNode = null;
    if (next !== undefined && next.kind === 'set' && next.conflictHead) {
      title = <ConflictGroupTitle event={next.event} onPress={handleConflict} />;
    }

    let content: React.ReactNode = null;
    switch (item.kind) {
      case 'title':
        content = <PlanDayTitle dayStart={item.dayStart} tone={tone} height={item.height} />;
        break;
      case 'set':
        content = (
          <View>
            <View style={{ paddingHorizontal: LIST_GUTTER }}>
              <PlanSetRow item={item} onPressArtist={handleArtist} />
            </View>
            {item.state === 'live' && <NowArrow y={item.progress * item.height} />}
          </View>
        );
        break;
      case 'gap':
        content = <PlanGap item={item}>{title}</PlanGap>;
        break;
      case 'cap':
        content = <PlanCap item={item}>{title}</PlanCap>;
        break;
      case 'spacer':
        content = <View style={{ height: item.height }}>{title}</View>;
        break;
      case 'empty':
        content = <PlanEmpty conflictsOnly={conflictsOnly} height={item.height} />;
        break;
    }
    return <View style={{ height: item.height + PLAN_LAYOUT.itemSpacing }}>{content}</View>;
  }, [items, tone, conflictsOnly, handleArtist, handleConflict]);

  const getItemLayout = useCallback((_: ArrayLike<PlanItem> | null | undefined, index: number) => ({
    length: items[index].height + PLAN_LAYOUT.itemSpacing,
    offset: offsets[index],
    index,
  }), [items, offsets]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={handleLayout}>
      <FlatList
        testID="plan-list"
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        onScrollEndDrag={persistScroll}
        onMomentumScrollEnd={persistScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingTop: PLAN_LAYOUT.paddingTop, paddingBottom: 24 + bottomClearance }}
      />
    </View>
  );
}
