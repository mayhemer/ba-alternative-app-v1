import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { SharedInterestStatus } from '../../adapters/baShareApiAdapter';
import type { ConflictOverlap } from '../../utils/conflictUtils';
import { matchesScope, type LensScope } from '../../utils/interestUtils';
import { categoryLaneModel, laneTitleModel, type CategoryLaneModel, type LaneSetInput, type LaneTitleModel } from './CategoryLane.model';
import { DAY_DURATION_MS, RULER_HEIGHT } from './timelineLayout';

// ── One festival day of a timeline: which lanes, where ────────────────────────
//
// Which sets a timeline shows on a day, in which lanes, stacked where. The one
// source of the lane stack's geometry: each lane's model, its title, where its
// strip starts, and the canvas height — so the titles (drawn outside the
// scroller) and the lanes cannot drift apart.
//
// The lens and the screen's filter decide which sets are listed. A block's star
// and its conflict bars follow my own picks under every lens.

export type TimelineDayInputs = {
  events: DbEvent[];
  artists: DbArtist[];
  categories: DbCategory[];
  /** Unix ms of the day's 06:00; 0 while there are no days. */
  dayStart: number;
  /** The screen's own filter: bands on the Program, the rest on the Support Program. */
  filterArtist?: (artist: DbArtist) => boolean;
  scope: LensScope;
  interests: Record<string, string>;
  /** The focused friend's picks, for a friend's lens. */
  friendInterests: Record<string, SharedInterestStatus> | undefined;
  hiddenCategories: ReadonlySet<string>;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
  /** Stack overlapping sets of a lane in rows (the Support Program). */
  stack: boolean;
  /** Short viewport: no title strips, titles drawn over their lanes. */
  overlayTitles: boolean;
};

export type TimelineDayModel = {
  /** The shown lanes, in category order. */
  lanes: CategoryLaneModel[];
  titles: LaneTitleModel[];
  /** categoryId → where its strip starts, from the top of the lane stack. */
  tops: Record<string, number>;
  /** The ruler plus every lane. */
  canvasHeight: number;
  /** The earliest set the lens and the filter let through, hidden lanes included: where the day lands. */
  firstEventMs: number | undefined;
};

export function timelineDayModel(inputs: TimelineDayInputs): TimelineDayModel {
  const { events, artists, categories, dayStart, filterArtist, scope, interests, friendInterests, hiddenCategories, conflictOverlaps, stack, overlayTitles } = inputs;
  const artistById = new Map(artists.map((a) => [a.artistId, a]));
  const byCategory = new Map<string, LaneSetInput[]>();
  let firstEventMs: number | undefined;

  if (dayStart !== 0) {
    const dayEnd = dayStart + DAY_DURATION_MS;
    for (const event of events) {
      if (event.dateFrom < dayStart || event.dateFrom >= dayEnd) {
        continue;
      }
      const artist = artistById.get(event.artistId);
      if (artist === undefined || (filterArtist !== undefined && !filterArtist(artist))) {
        continue;
      }
      const status = (interests[artist.artistId] ?? 'none') as InterestStatus;
      if (!matchesScope(scope, status, friendInterests?.[artist.artistId])) {
        continue;
      }
      if (firstEventMs === undefined || event.dateFrom < firstEventMs) {
        firstEventMs = event.dateFrom;
      }
      const lane = byCategory.get(event.categoryId) ?? [];
      lane.push({ event, artist, status, overlaps: conflictOverlaps.get(event.eventId) });
      byCategory.set(event.categoryId, lane);
    }
  }

  const lanes: CategoryLaneModel[] = [];
  const titles: LaneTitleModel[] = [];
  const tops: Record<string, number> = {};
  let y = 0;
  const ordered = [...categories].sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId));
  for (const category of ordered) {
    const sets = byCategory.get(category.categoryId);
    if (sets === undefined || hiddenCategories.has(category.categoryId)) {
      continue;
    }
    const lane = categoryLaneModel(category, sets, { stack, overlayTitles });
    lanes.push(lane);
    titles.push(laneTitleModel(category, lane, y, overlayTitles));
    tops[lane.key] = y;
    y += lane.stripHeight + lane.height;
  }

  return { lanes, titles, tops, canvasHeight: RULER_HEIGHT + y, firstEventMs };
}
