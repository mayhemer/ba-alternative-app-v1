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
  STRIP_HEIGHT,
} from '../components/timeline/timelineLayout';
import { matchesScope } from '../utils/interestUtils';
import { computeConflictEntries } from '../utils/conflictUtils';

type Options = {
  filterArtist?: (artist: DbArtist) => boolean;
  useSubRows?: boolean;
};

export type TimelineData = {
  events: DbEvent[];
  eventsByCategory: Record<string, LaneEvent[]>;
  visibleCategories: DbCategory[];
  laneHeights: Record<string, number>;
  categorySubRows: Record<string, Record<string, number>>;
  canvasHeight: number;
  conflictingEventIds: Set<string>;
};

export function useTimelineData({ filterArtist, useSubRows = false }: Options = {}): TimelineData {
  const selectedSlug = useSelectedSlug();
  const { getStatus, interests } = useInterest();
  const { selectedDayStart, hiddenCategories } = useTimelineFilter();
  const { scope } = useLens();
  const { getFriend } = useSocialData();
  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  const eventsRef     = useRef<DbEvent[]>([]);
  const artistsRef    = useRef<DbArtist[]>([]);
  const categoriesRef = useRef<DbCategory[]>([]);
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

  const canvasHeight = useMemo<number>(() => {
    return RULER_HEIGHT + visibleCategories.reduce((sum, cat) => {
      return sum + STRIP_HEIGHT + (laneHeights[cat.categoryId] ?? LANE_HEIGHT);
    }, 0);
  }, [visibleCategories, laneHeights]);

  const conflictingEventIds = useMemo<Set<string>>(() => {
    const entries = computeConflictEntries(selectedSlug, interests);
    return new Set(entries.map((e) => e.event.eventId));
  }, [selectedSlug, interests]);

  return {
    events: eventsRef.current,
    eventsByCategory,
    visibleCategories,
    laneHeights,
    categorySubRows,
    canvasHeight,
    conflictingEventIds,
  };
}
