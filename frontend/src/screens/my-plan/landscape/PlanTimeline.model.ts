import type { DbArtist, DbCategory, DbEvent } from '../../../types/backend';
import type { ConflictOverlap } from '../../../lib/conflictUtils';
import { DEFAULT_SCOPE } from '../../../lib/interestUtils';
import { onSupportProgram } from '../../../lib/timelineJump';
import { planLevelLists, type PlanFilterLevel } from '../../../lib/plan';
import { getFestivalDayStart } from '../../../utils/festivalTime';
import { timelineDayModel, type TimelineDayModel } from '../../timeline/TimelineDay.model';
import { orderLanes, screenCategories } from '../../timeline/order/laneOrder';

// ── My plan in landscape: which sets, in which lanes ──────────────────────────
//
// Turned to landscape, My plan shows its day as a timeline. Its lanes are
// categories, as on the Program and the Support Program: the Program's first,
// in its lane order, then the Support Program's, in its.
//
// A set shows where you picked something that day in its category on its
// stage, its pair: a Must-see or a Maybe, of any length ("don't go" is no
// pick). A busy category, or a stage hosting several, shows only what is next
// to what you are going to anyway:
//
//   - Only conflicts: the clashing Must-sees (the shared conflict calculation);
//   - Must-see only, Must-see and Maybe: your picks at that level, those over
//     3 h too, which the list leaves out (a row early in the day, forgotten;
//     on the timeline a long block shows it all day);
//   - All sets: every band, as the list, and every set of a picked pair,
//     picked or not, support items too.
//
// One rule, planTimelineRule, which search follows in landscape too
// (planSearchScope).

/** The landscape timeline's rule: whether it shows a set under a filter. */
export type PlanTimelineRule = {
  shows: (level: PlanFilterLevel, event: DbEvent, clashing: boolean) => boolean;
};

const pairOf = (event: DbEvent): string => `${getFestivalDayStart(event.dateFrom)}|${event.stageId}|${event.categoryId}`;

const isPick = (status: string | undefined): status is 'will_go' | 'maybe' => status === 'will_go' || status === 'maybe';

export function planTimelineRule(
  interests: Record<string, string>,
  events: Iterable<DbEvent>,
  artists: Iterable<DbArtist>,
): PlanTimelineRule {
  const picked = new Set<string>();
  for (const event of events) {
    if (isPick(interests[event.artistId])) {
      picked.add(pairOf(event));
    }
  }
  const bands = new Set<string>();
  for (const artist of artists) {
    if (!onSupportProgram(artist)) {
      bands.add(artist.artistId);
    }
  }
  return {
    shows: (level, event, clashing) => {
      if (level === 'all' && bands.has(event.artistId)) {
        return true;
      }
      if (!picked.has(pairOf(event))) {
        return false;
      }
      if (level === 'all') {
        return true;
      }
      const status = interests[event.artistId];
      return isPick(status) && planLevelLists(level, status, clashing);
    },
  };
}

/**
 * The lanes' order, as categoryIds top first: the Program's categories (those
 * holding a band's set) in its saved order, then the Support Program's (the
 * rest holding a set) in its. A category holding both is the Program's. Each
 * side puts what its order does not name after, by id (orderLanes).
 */
export function planLaneOrder({ events, artists, categories, programOrder, supportOrder }: {
  events: readonly DbEvent[];
  artists: readonly DbArtist[];
  categories: readonly DbCategory[];
  programOrder: readonly string[] | undefined;
  supportOrder: readonly string[] | undefined;
}): string[] {
  const program = screenCategories({ categories, events, artists, filterArtist: (a) => !onSupportProgram(a) });
  const inProgram = new Set(program.map((c) => c.categoryId));
  const support = screenCategories({ categories, events, artists, filterArtist: onSupportProgram })
    .filter((c) => !inProgram.has(c.categoryId));
  return [
    ...orderLanes(program, programOrder ?? []),
    ...orderLanes(support, supportOrder ?? []),
  ].map((c) => c.categoryId);
}

export type PlanTimelineDayInputs = {
  interests: Record<string, string>;
  events: DbEvent[];
  artists: DbArtist[];
  categories: DbCategory[];
  /** The lanes' order (planLaneOrder). */
  laneOrder: readonly string[];
  /** The shared conflict calculation's clashes, by event id. */
  overlaps: Map<string, ConflictOverlap[]>;
  /** Unix ms of the shown day's 06:00. */
  dayStart: number;
  level: PlanFilterLevel;
  /** Short viewport: no title strips, titles drawn over their lanes. */
  overlayTitles: boolean;
};

const NO_HIDDEN: ReadonlySet<string> = new Set();

/**
 * The day's lanes: the timelines' own model (TimelineDay.model), every lens
 * and hidden lane left out, keeping the sets planTimelineRule shows. The lanes
 * stack overlapping sets in rows, as the Support Program does: both bands and
 * support items can be on them.
 */
export function planTimelineDayModel(inputs: PlanTimelineDayInputs): TimelineDayModel {
  const { interests, events, artists, categories, laneOrder, overlaps, dayStart, level, overlayTitles } = inputs;
  const rule = planTimelineRule(interests, events, artists);
  return timelineDayModel({
    events,
    artists,
    categories,
    dayStart,
    filterSet: (event) => rule.shows(level, event, overlaps.has(event.eventId)),
    scope: DEFAULT_SCOPE,
    interests,
    friendInterests: undefined,
    hiddenCategories: NO_HIDDEN,
    laneOrder,
    conflictOverlaps: overlaps,
    stack: true,
    overlayTitles,
  });
}
