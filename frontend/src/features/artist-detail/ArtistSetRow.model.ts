import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';
import type { ConflictEntry } from '../conflicts/conflictUtils';
import { decodeCategoryColor } from '../../utils/color';
import { getStageLocalized } from '../../utils/localization';
import { formatDayLabel, formatTime } from '../../utils/festivalTime';
import { timelineJump, type TimelineJump } from '../../navigation/timelineJump';
import { colors } from '../../styling/tokens';

// ── One of the artist's sets in the sheet: what it shows ──────────────────────
//
// The stage, the date and the time of the set, its category's colour, and —
// while it clashes — how many sets it overlaps, from the shared conflict
// calculation (the clash My plan, the timeline and the drawer count). The date
// is the calendar date: a set at 00:35 on Wednesday night reads "Thu 7". A tap
// goes to the set on its timeline, on the festival day it is drawn on.

export type ArtistSetRowModel = {
  /** The eventId. */
  key: string;
  event: DbEvent;
  stage: string;
  /** "Thu 7". */
  day: string;
  /** "00:35–01:30". */
  time: string;
  borderColor: string;
  /** "Overlaps with 2 other event(s)" while the set clashes, else null. */
  conflict: string | null;
  /** Where a tap goes: the timeline (support or main) and the festival day it is drawn on. */
  jump: TimelineJump;
  /** The sheet's side padding, kept clear on either side. */
  margin: number;
};

export type ArtistSetRowInputs = {
  event: DbEvent;
  artist: DbArtist;
  stage: DbStage | undefined;
  category: DbCategory | undefined;
  /** The set's entry in the shared conflict calculation, if it clashes. */
  conflict: ConflictEntry | undefined;
  /** The sheet's side padding. */
  padding: number;
};

export function artistSetRowModel({ event, artist, stage, category, conflict, padding }: ArtistSetRowInputs): ArtistSetRowModel {
  return {
    key: event.eventId,
    event,
    stage: stage !== undefined ? getStageLocalized(stage.localized, 'name') : '',
    day: formatDayLabel(event.dateFrom),
    time: `${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`,
    borderColor: category !== undefined ? decodeCategoryColor(category.color) : colors.textPrimary,
    conflict: conflict !== undefined ? `Overlaps with ${conflict.overlapCount} other event(s)` : null,
    jump: timelineJump(artist, event),
    margin: padding,
  };
}
