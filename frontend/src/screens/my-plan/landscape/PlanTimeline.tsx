import React, { useCallback, useMemo } from 'react';
import { useSelectedSlug } from '../../../store/AppContext';
import { useArtists, useCategories, useEvents } from '../../../store/cacheStore';
import { useDeferredInterests } from '../../../features/interests/InterestContext';
import { useConflicts } from '../../../features/conflicts/ConflictContext';
import { useArtistDetail } from '../../../features/artist-detail/ArtistDetailContext';
import type { PlanFilterLevel } from '../../../lib/plan';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { useTimelineFilter } from '../../timeline/TimelineFilterContext';
import { TimelineView } from '../../timeline/TimelineView';
import { PlanFilterSkeleton } from '../filter/PlanFilterSkeleton';
import { planLaneOrder, planTimelineDayModel } from './PlanTimeline.model';
import type { DbArtist, DbEvent } from '../../../types/backend';

// ── My plan in landscape ─────────────────────────────────────────────────────
//
// The shown day as a timeline: category lanes, the Program's then the Support
// Program's, showing the sets the plan's filter shows and only on the stages
// holding a pick of yours (PlanTimeline.model). Every lens and the timelines'
// hidden lanes are left out: the plan's filter alone decides.
//
// Its scroll is remembered per day under its own key, apart from the list's.
// It lands centred on the screen's time, kept by My plan, and tells My plan a
// new one only for a landing of its own on a day without one, a request, or
// the end of the user's own scroll (TimelineView › the time at the centre).
// My plan asks it to scroll to now or to a set through the timelines' shared
// request (TimelineFilterContext), under this key.

export const PLAN_TIMELINE_SCREEN_KEY = 'plan-timeline';

const noop = (): void => {};

type Props = {
  /** The day My plan shows (its 06:00). */
  day: number;
  level: PlanFilterLevel;
  /** A pull down past the lanes' top: the filter panel, as on the list. */
  onPullPastTop: () => void;
  /** Where it first lands: centred on this time (the list's), else its saved position. */
  landingCentreMs?: number;
  /** Told the time at its centre whenever it lands or is scrolled. */
  onCentreTime: (timeMs: number, dayStart: number) => void;
};

export function PlanTimeline({ day, level, onPullPastTop, landingCentreMs, onCentreTime }: Props) {
  const slug = useSelectedSlug();
  const interests = useDeferredInterests();
  const { overlaps } = useConflicts();
  const events = useEvents(slug);
  const artists = useArtists(slug);
  const categories = useCategories(slug);
  const { laneOrders } = useTimelineFilter();
  const { isShort } = useLayoutMode();
  const { openDetail } = useArtistDetail();

  // The whole festival's categories: a pick or the day does not move them.
  const programOrder = laneOrders.timeline;
  const supportOrder = laneOrders.support;
  const laneOrder = useMemo(
    () => planLaneOrder({ events, artists, categories, programOrder, supportOrder }),
    [events, artists, categories, programOrder, supportOrder],
  );

  const model = useMemo(
    () => planTimelineDayModel({
      interests,
      events,
      artists,
      categories,
      laneOrder,
      overlaps,
      dayStart: day,
      level,
      overlayTitles: isShort,
    }),
    [interests, events, artists, categories, laneOrder, overlaps, day, level, isShort],
  );

  const handleBlockPress = useCallback((_event: DbEvent, artist: DbArtist): void => {
    openDetail(artist, 'collapsed');
  }, [openDetail]);

  return (
    <TimelineView
      screenKey={PLAN_TIMELINE_SCREEN_KEY}
      day={model}
      selectedDayStart={day}
      onBlockPress={handleBlockPress}
      onLongPress={noop}
      onPullPastTop={onPullPastTop}
      pullPreview={PlanFilterSkeleton}
      landingCentreMs={landingCentreMs}
      onCentreTime={onCentreTime}
    />
  );
}
