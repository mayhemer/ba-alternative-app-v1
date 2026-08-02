import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCacheRefresh, useSelectedSlug } from '../store/AppContext';
import {
  getArtists,
  getCategories,
  getEvents,
  getCategoryDayLayout,
} from '../cache/cacheService';
import { useInterest } from '../context/InterestContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { useLens } from '../context/LensContext';
import { useSocialData } from '../context/SocialContext';
import type { LaneEvent } from '../components/timeline/CategoryLane';
import type { DbArtist, DbCategory, DbEvent } from '../types/backend';
import {
  DAY_DURATION_MS,
  LANE_HEIGHT,
  RULER_HEIGHT,
  stripHeightFor,
} from '../components/timeline/timelineLayout';
import { useLayoutMode } from './useLayoutMode';
import { matchesScope } from '../utils/interestUtils';
import { computeConflictOverlaps, type ConflictOverlap } from '../utils/conflictUtils';

type Options = {
  filterArtist?: (artist: DbArtist) => boolean;
  useSubRows?: boolean;
};

export type TimelineData = {
  events: DbEvent[];
  eventsByCategory: Record<string, LaneEvent[]>;
  visibleCategories: DbCategory[];
  laneHeights: Record<string, number>;
  /** Y of each category's title strip, measured from the top of the lane stack. */
  laneOffsets: Record<string, number>;
  categorySubRows: Record<string, Record<string, number>>;
  canvasHeight: number;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
};

export function useTimelineData({ filterArtist, useSubRows = false }: Options = {}): TimelineData {
  const selectedSlug = useSelectedSlug();
  const { getStatus, interests } = useInterest();
  const { selectedDayStart, hiddenCategories } = useTimelineFilter();
  const { scope } = useLens();
  const { isShort } = useLayoutMode();
  const { getFriend } = useSocialData();

  // Landscape drops the title strip and overlays the title on the lane instead;
  // TimelineView derives the same value from the same flag for its own layout.
  const stripHeight = stripHeightFor(isShort);
  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Seeded from the cache during the first render, not from the mount effect
  // below: StartupGate has already populated it, and reading a frame later left
  // the first render with no events at all — long enough for consumers to act on
  // an empty timeline (see DESIGN.md).
  const eventsRef     = useRef<DbEvent[]>(getEvents(selectedSlug));
  const artistsRef    = useRef<DbArtist[]>(getArtists(selectedSlug));
  const categoriesRef = useRef<DbCategory[]>(getCategories(selectedSlug));
  const [revision, setRevision] = useState(0);

  const loadData = useCallback(() => {
    eventsRef.current     = getEvents(selectedSlug);
    artistsRef.current    = getArtists(selectedSlug);
    categoriesRef.current = getCategories(selectedSlug);
    setRevision((r) => r + 1);
  }, [selectedSlug]);

  useEffect(() => { loadData(); }, [loadData]);
  useCacheRefresh(loadData);

  const artistById = useMemo<Record<string, DbArtist>>(() => {
    const map: Record<string, DbArtist> = {};
    for (const a of artistsRef.current) {
      map[a.artistId] = a;
    }
    return map;
    // `revision` is the dependency ESLint cannot see: the body reads a ref, so the
    // counter loadData bumps is the only signal that its contents changed. It is
    // not redundant — drop it and the map freezes at whatever was cached on mount,
    // so a slug switch or a background sync never reaches the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // Keep getStatus accessible inside the memo without depending on its identity.
  // getStatus is a useCallback derived from interests and changes on every toggle,
  // so we read it via a ref and depend on the raw interests data instead.
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;

  const eventsByCategory = useMemo<Record<string, LaneEvent[]>>(() => {
    if (selectedDayStart === 0) { return {}; }
    const dayEnd = selectedDayStart + DAY_DURATION_MS;
    const grouped: Record<string, LaneEvent[]> = {};

    for (const event of eventsRef.current) {
      if (event.dateFrom < selectedDayStart || event.dateFrom >= dayEnd) { continue; }
      const artist = artistById[event.artistId];
      if (artist === undefined) { continue; }
      if (filterArtist !== undefined && !filterArtist(artist)) { continue; }
      if (!matchesScope(scope, getStatusRef.current(artist.artistId), friendInterests?.[artist.artistId])) { continue; }
      if (grouped[event.categoryId] === undefined) { grouped[event.categoryId] = []; }
      grouped[event.categoryId].push({ event, artist });
    }
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistById, selectedDayStart, scope, friendInterests, interests, filterArtist]);

  const visibleCategories = useMemo<DbCategory[]>(() => {
    return [...categoriesRef.current]
      .sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId))
      .filter(
        (c) =>
          !hiddenCategories.has(c.categoryId) &&
          (eventsByCategory[c.categoryId]?.length ?? 0) > 0,
      );
    // Same as artistById above: `revision` stands in for categoriesRef's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, hiddenCategories, eventsByCategory]);

  const laneHeights = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const cat of visibleCategories) {
      if (useSubRows) {
        const layout = getCategoryDayLayout(selectedSlug, cat.categoryId, selectedDayStart);
        map[cat.categoryId] = layout.subRowCount * LANE_HEIGHT;
      } else {
        map[cat.categoryId] = LANE_HEIGHT;
      }
    }
    return map;
  }, [visibleCategories, useSubRows, selectedSlug, selectedDayStart]);

  const categorySubRows = useMemo<Record<string, Record<string, number>>>(() => {
    if (!useSubRows) { return {}; }
    const map: Record<string, Record<string, number>> = {};
    for (const cat of visibleCategories) {
      const layout = getCategoryDayLayout(selectedSlug, cat.categoryId, selectedDayStart);
      map[cat.categoryId] = layout.eventSubRows;
    }
    return map;
  }, [visibleCategories, useSubRows, selectedSlug, selectedDayStart]);

  // Where each lane's title strip starts. Owned here, alongside canvasHeight and
  // from the same inputs, so the label overlay — which is rendered outside the
  // horizontally-scrolling layer and therefore cannot infer positions from
  // layout — stays in step with the lanes it labels.
  //
  // Measured from the top of the lane stack, i.e. excluding RULER_HEIGHT: the
  // ruler sits outside both scrollers, so the first strip is at y = 0.
  const laneOffsets = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    let y = 0;
    for (const cat of visibleCategories) {
      map[cat.categoryId] = y;
      y += stripHeight + (laneHeights[cat.categoryId] ?? LANE_HEIGHT);
    }
    return map;
  }, [visibleCategories, laneHeights, stripHeight]);

  const canvasHeight = useMemo<number>(() => {
    return RULER_HEIGHT + visibleCategories.reduce((sum, cat) => {
      return sum + stripHeight + (laneHeights[cat.categoryId] ?? LANE_HEIGHT);
    }, 0);
  }, [visibleCategories, laneHeights, stripHeight]);

  const conflictOverlaps = useMemo<Map<string, ConflictOverlap[]>>(() => {
    return computeConflictOverlaps(selectedSlug, interests);
  }, [selectedSlug, interests]);

  return {
    events: eventsRef.current,
    eventsByCategory,
    visibleCategories,
    laneHeights,
    laneOffsets,
    categorySubRows,
    canvasHeight,
    conflictOverlaps,
  };
}
