import { useMemo } from 'react';
import { useSelectedSlug } from '../../store/AppContext';
import {
  useArtistEventMap,
  useArtists,
  useCategories,
  useEvents,
  useStages,
} from '../../store/cacheStore';
import { useInterest } from '../../features/interests/InterestContext';
import { useTimelineFilter } from './TimelineFilterContext';
import { useLens } from '../../features/social/LensContext';
import { useSocialData } from '../../features/social/SocialContext';
import type { DbArtist } from '../../types/backend';
import { timelineDayModel, type TimelineDayModel } from './TimelineDay.model';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { computeConflictOverlaps } from '../../features/conflicts/conflictUtils';

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

/**
 * The inputs of one timeline day, gathered from the cache and the contexts and
 * handed to its model (TimelineDay.model.ts), which decides everything shown.
 */
export function useTimelineData({ dayStart, filterArtist, useSubRows = false }: Options): TimelineDayModel {
  const selectedSlug = useSelectedSlug();
  const { interests } = useInterest();
  const { hiddenCategories } = useTimelineFilter();
  const { scope } = useLens();
  const { isShort } = useLayoutMode();
  const { getFriend } = useSocialData();

  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read straight from the cache store. Each hook subscribes as a side effect of
  // reading, and returns a referentially stable value, so the memos below can
  // depend on the data itself. Values are present on the first render —
  // StartupGate has already populated the cache — so no mount effect and no
  // empty first frame.
  const events     = useEvents(selectedSlug);
  const artists    = useArtists(selectedSlug);
  const categories = useCategories(selectedSlug);
  const stages     = useStages(selectedSlug);
  const artistEvents = useArtistEventMap(selectedSlug);

  // The cache inputs are dependencies: a memo that read the cache through
  // computeConflictOverlaps but depended only on the interest map is why the
  // timeline's conflict bars once went stale after a background sync.
  const conflictOverlaps = useMemo(
    () => computeConflictOverlaps(interests, { artists, stages, artistEvents }),
    [interests, artists, stages, artistEvents],
  );

  return useMemo(
    () => timelineDayModel({
      events,
      artists,
      categories,
      dayStart,
      filterArtist,
      scope,
      interests,
      friendInterests,
      hiddenCategories,
      conflictOverlaps,
      stack: useSubRows,
      overlayTitles: isShort,
    }),
    [events, artists, categories, dayStart, filterArtist, scope, interests, friendInterests, hiddenCategories, conflictOverlaps, useSubRows, isShort],
  );
}
