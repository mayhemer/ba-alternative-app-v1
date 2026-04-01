import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppState, useCacheRefresh } from '../store/AppContext';
import {
  getArtists,
  getCategories,
  getEvents,
  getCategoryDayLayout,
} from '../cache/cacheService';
import { useInterest } from '../context/InterestContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import type { LaneEvent } from '../components/timeline/CategoryLane';
import type { DbArtist, DbCategory, DbEvent } from '../types/backend';
import {
  DAY_DURATION_MS,
  LANE_HEIGHT,
  RULER_HEIGHT,
  STRIP_HEIGHT,
} from '../components/timeline/timelineLayout';

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
};

export function useTimelineData({ filterArtist, useSubRows = false }: Options = {}): TimelineData {
  const { selectedSlug } = useAppState();
  const { getStatus } = useInterest();
  const { selectedDayStart, myScheduleOnly, hiddenCategories } = useTimelineFilter();

  const eventsRef     = useRef<DbEvent[]>([]);
  const artistsRef    = useRef<DbArtist[]>([]);
  const categoriesRef = useRef<DbCategory[]>([]);
  const [, setRevision] = useState(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistsRef.current]);

  const eventsByCategory = useMemo<Record<string, LaneEvent[]>>(() => {
    if (selectedDayStart === 0) { return {}; }
    const dayEnd = selectedDayStart + DAY_DURATION_MS;
    const grouped: Record<string, LaneEvent[]> = {};

    for (const event of eventsRef.current) {
      if (event.dateFrom < selectedDayStart || event.dateFrom >= dayEnd) { continue; }
      const artist = artistById[event.artistId];
      if (artist === undefined) { continue; }
      if (filterArtist !== undefined && !filterArtist(artist)) { continue; }
      if (myScheduleOnly && getStatus(artist.artistId) === 'none') { continue; }
      if (grouped[event.categoryId] === undefined) { grouped[event.categoryId] = []; }
      grouped[event.categoryId].push({ event, artist });
    }
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistById, selectedDayStart, myScheduleOnly, getStatus, filterArtist]);

  const visibleCategories = useMemo<DbCategory[]>(() => {
    return [...categoriesRef.current]
      .sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId))
      .filter(
        (c) =>
          !hiddenCategories.has(c.categoryId) &&
          (eventsByCategory[c.categoryId]?.length ?? 0) > 0,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesRef.current, hiddenCategories, eventsByCategory]);

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

  return {
    events: eventsRef.current,
    eventsByCategory,
    visibleCategories,
    laneHeights,
    categorySubRows,
    canvasHeight,
  };
}
