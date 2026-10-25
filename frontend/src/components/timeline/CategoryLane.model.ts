import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../../utils/conflictUtils';
import { decodeCategoryColor } from '../../utils/color';
import { getCategoryLocalized } from '../../utils/localization';
import { assignSubRows, LANE_HEIGHT, STRIP_HEIGHT, stripHeightFor } from './timelineLayout';

// ── A category lane and its title: what they show ─────────────────────────────
//
// A lane is a title strip and an events row. Everything about it comes from the
// sets it shows: which they are, each one's row, and so its height — overlapping
// sets stack in rows (on the Support Program and in the conflict sheet), counted
// from these sets only, never from ones the lens or a filter hides. Its title
// comes from the same model, so the title can never sit off its lane.

/** A set the lane shows, with what its block needs: my pick and its overlaps. */
export type LaneSetInput = {
  event: DbEvent;
  artist: DbArtist;
  status: InterestStatus;
  overlaps: ConflictOverlap[] | undefined;
};

export type LaneSet = LaneSetInput & { subRow: number };

export type CategoryLaneModel = {
  /** The categoryId. */
  key: string;
  /** The category's colour, which its blocks are tinted from. */
  color: string;
  /** Above the events row; zero on a short viewport, where the title is drawn over the lane. */
  stripHeight: number;
  /** The events row: one LANE_HEIGHT per row. */
  height: number;
  sets: LaneSet[];
};

export type LaneTitleModel = {
  /** `title-<categoryId>`. */
  key: string;
  text: string;
  /** From the top of the lane stack. */
  top: number;
  height: number;
  fontSize: number;
  paddingTop: number;
  /** Over the lane (short viewport): at its top, else centred in the strip. */
  overLane: boolean;
};

type LaneOptions = {
  /** Stack overlapping sets in rows; else every set is drawn in the first row. */
  stack: boolean;
  /** Short viewport: no strip, the title drawn over the lane. */
  overlayTitles: boolean;
};

export function categoryLaneModel(category: DbCategory, sets: LaneSetInput[], { stack, overlayTitles }: LaneOptions): CategoryLaneModel {
  const layout = stack ? assignSubRows(sets.map((s) => s.event)) : null;
  return {
    key: category.categoryId,
    color: decodeCategoryColor(category.color),
    stripHeight: stripHeightFor(overlayTitles),
    height: (layout?.subRowCount ?? 1) * LANE_HEIGHT,
    sets: sets.map((s) => ({ ...s, subRow: layout?.eventSubRows[s.event.eventId] ?? 0 })),
  };
}

// Landscape only: keeps the title off the lane's top border, just above where
// blocks start.
const OVERLAY_TITLE_TOP = 4;

/** The title of a lane whose strip starts `top` down the lane stack. */
export function laneTitleModel(category: DbCategory, lane: CategoryLaneModel, top: number, overlayTitles: boolean): LaneTitleModel {
  return {
    key: `title-${category.categoryId}`,
    text: getCategoryLocalized(category.localized, 'title'),
    top,
    height: overlayTitles ? lane.height : STRIP_HEIGHT,
    fontSize: overlayTitles ? 16 : 14,
    paddingTop: overlayTitles ? OVERLAY_TITLE_TOP : 0,
    overLane: overlayTitles,
  };
}
