import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from './conflictUtils';
import { categoryLaneModel, laneTitleModel, type CategoryLaneModel, type LaneSetInput, type LaneTitleModel } from '../timeline/CategoryLane.model';
import { conflictWindow, labelRepeatPx, timeToX } from '../timeline/timelineLayout';
import { getFestivalDayStart } from '../../utils/festivalTime';

// ── The conflict sheet's timeline: what it shows ──────────────────────────────
//
// One clash group on a timeline of its own: the timeline's own lanes, holding
// only the group's sets — bands and support programme alike — each lane stacked
// in rows from those sets, and cut to the group's time range (conflictWindow),
// at least as wide as the sheet. No lens and no hidden lanes: a fixed view of
// the clash. Its labels repeat at the sheet's measured width.

export type ConflictTimelineInputs = {
  /** The clash group, non-empty, all on one festival day. */
  group: DbEvent[];
  artists: DbArtist[];
  categories: DbCategory[];
  interests: Record<string, string>;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
  /** The sheet's measured width. */
  viewWidth: number;
};

export type ConflictTimelineModel = {
  dayStart: number;
  /** The range's left edge on the day's canvas. */
  fromX: number;
  /** The range's width: what the sheet shows. */
  width: number;
  lanes: CategoryLaneModel[];
  titles: LaneTitleModel[];
  /** The lanes' height, titles' strips included. */
  stackHeight: number;
  labelRepeat: number;
};

export function conflictTimelineModel({ group, artists, categories, interests, conflictOverlaps, viewWidth }: ConflictTimelineInputs): ConflictTimelineModel {
  const dayStart = getFestivalDayStart(group[0].dateFrom);
  const range = conflictWindow(group, dayStart, viewWidth);
  const fromX = timeToX(range.from, dayStart);
  const artistById = new Map(artists.map((a) => [a.artistId, a]));

  const lanes: CategoryLaneModel[] = [];
  const titles: LaneTitleModel[] = [];
  let y = 0;
  const ordered = [...categories].sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId));
  for (const category of ordered) {
    const sets: LaneSetInput[] = [];
    for (const event of group) {
      const artist = artistById.get(event.artistId);
      if (event.categoryId === category.categoryId && artist !== undefined) {
        const status = (interests[artist.artistId] ?? 'none') as InterestStatus;
        sets.push({ event, artist, status, overlaps: conflictOverlaps.get(event.eventId) });
      }
    }
    if (sets.length === 0) {
      continue;
    }
    const lane = categoryLaneModel(category, sets, { stack: true, overlayTitles: false });
    lanes.push(lane);
    titles.push(laneTitleModel(category, lane, y, false));
    y += lane.stripHeight + lane.height;
  }

  return {
    dayStart,
    fromX,
    width: timeToX(range.to, dayStart) - fromX,
    lanes,
    titles,
    stackHeight: y,
    labelRepeat: labelRepeatPx(viewWidth),
  };
}
