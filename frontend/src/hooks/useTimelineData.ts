import { useMemo } from 'react';
import { useSelectedSlug } from '../store/AppContext';
import {
  useArtistEventMap,
  useArtists,
  useCategories,
  useEvents,
  useLayoutMap,
  useStages,
} from '../store/cacheStore';
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
  /**
   * The festival day to lay out (its 06:00 start). Passed in rather than read
   * from TimelineFilterContext: the screen derives the day it shows during
   * render, before the context has caught up, and the lanes must be for that
   * same day — the view takes its landing position from their first event.
   */
  dayStart: number;
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

export function useTimelineData({ dayStart: selectedDayStart, filterArtist, useSubRows = false }: Options): TimelineData {
  const selectedSlug = useSelectedSlug();
  const { getStatus, interests } = useInterest();
  const { hiddenCategories } = useTimelineFilter();
  const { scope } = useLens();
  const { isShort } = useLayoutMode();
  const { getFriend } = useSocialData();

  // Landscape drops the title strip and overlays the title on the lane instead;
  // TimelineView derives the same value from the same flag for its own layout.
  const stripHeight = stripHeightFor(isShort);
  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read straight from the cache store. Each hook subscribes as a side effect of
  // reading, and returns a referentially stable value, so every memo below can
  // depend on the data itself: the old refs-plus-revision-counter arrangement
  // (and the exhaustive-deps suppressions it needed) is gone. Values are present
  // on the first render — StartupGate has already populated the cache — so no
  // mount effect and no empty first frame.
  const events     = useEvents(selectedSlug);
  const artists    = useArtists(selectedSlug);
  const categories = useCategories(selectedSlug);
  const stages     = useStages(selectedSlug);
  const artistEvents = useArtistEventMap(selectedSlug);
  const layoutMap  = useLayoutMap(selectedSlug);

  const artistById = useMemo<Record<string, DbArtist>>(() => {
    const map: Record<string, DbArtist> = {};
    for (const a of artists) {
      map[a.artistId] = a;
    }
    return map;
  }, [artists]);

  const eventsByCategory = useMemo<Record<string, LaneEvent[]>>(() => {
    if (selectedDayStart === 0) { return {}; }
    const dayEnd = selectedDayStart + DAY_DURATION_MS;
    const grouped: Record<string, LaneEvent[]> = {};

    for (const event of events) {
      if (event.dateFrom < selectedDayStart || event.dateFrom >= dayEnd) { continue; }
      const artist = artistById[event.artistId];
      if (artist === undefined) { continue; }
      if (filterArtist !== undefined && !filterArtist(artist)) { continue; }
      if (!matchesScope(scope, getStatus(artist.artistId), friendInterests?.[artist.artistId])) { continue; }
      if (grouped[event.categoryId] === undefined) { grouped[event.categoryId] = []; }
      grouped[event.categoryId].push({ event, artist });
    }
    return grouped;
    // `getStatus` rather than the raw interest map: it is a useCallback over
    // exactly that map, so it changes identity at the same moments and is the
    // honest dependency for the call above.
  }, [events, artistById, selectedDayStart, scope, friendInterests, getStatus, filterArtist]);

  const visibleCategories = useMemo<DbCategory[]>(() => {
    return [...categories]
      .sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId))
      .filter(
        (c) =>
          !hiddenCategories.has(c.categoryId) &&
          (eventsByCategory[c.categoryId]?.length ?? 0) > 0,
      );
  }, [categories, hiddenCategories, eventsByCategory]);

  const laneHeights = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const cat of visibleCategories) {
      if (useSubRows) {
        const layout = layoutMap[`${cat.categoryId}_${selectedDayStart}`];
        map[cat.categoryId] = (layout?.subRowCount ?? 1) * LANE_HEIGHT;
      } else {
        map[cat.categoryId] = LANE_HEIGHT;
      }
    }
    return map;
  }, [visibleCategories, useSubRows, layoutMap, selectedDayStart]);

  const categorySubRows = useMemo<Record<string, Record<string, number>>>(() => {
    if (!useSubRows) { return {}; }
    const map: Record<string, Record<string, number>> = {};
    for (const cat of visibleCategories) {
      map[cat.categoryId] = layoutMap[`${cat.categoryId}_${selectedDayStart}`]?.eventSubRows ?? {};
    }
    return map;
  }, [visibleCategories, useSubRows, layoutMap, selectedDayStart]);

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

  // This memo is why the timeline's conflict bars used to vanish: it read the
  // cache through computeConflictOverlaps but depended only on the slug and the
  // interest map, so a background sync (or a first load that landed after mount)
  // never recomputed it — while toggling a star did, which is exactly how the
  // bug presented. The cache inputs are now dependencies.
  const conflictOverlaps = useMemo<Map<string, ConflictOverlap[]>>(() => {
    return computeConflictOverlaps(interests, { artists, stages, artistEvents });
  }, [interests, artists, stages, artistEvents]);

  return {
    events,
    eventsByCategory,
    visibleCategories,
    laneHeights,
    laneOffsets,
    categorySubRows,
    canvasHeight,
    conflictOverlaps,
  };
}
