import type { DbArtist, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../conflicts/conflictUtils';
import { isInterested } from '../interests/interestUtils';
import { fitFontSize } from '../../utils/textFit';
import { categoryBlockColors } from '../../utils/color';
import { BLOCK_FONT_SIZE, LANE_BORDER_WIDTH, LANE_HEIGHT, MIN_BLOCK_WIDTH, PIXELS_PER_MS, timeToX } from './timelineLayout';
import { formatTime } from '../../utils/festivalTime';

// ── A set's block on the timeline: what it shows ──────────────────────────────
//
// Everything a block shows comes from its set, its day and its row: where it
// sits and how wide it is (its times), the label and how large it can be (that
// width), the star (the pick), and one striped bar per overlap interval, each
// over just the overlapping part. ArtistBlock draws only this.

export const BLOCK_LAYOUT = {
  /** Inner padding; the label width maths below subtracts it. */
  padding: 8,
  borderLeft: 3,
  starSize: 11,
  /** Narrower blocks show no label at all. */
  labelMinBlockWidth: 40,
  /** A repeat is skipped rather than drawn as a clipped sliver once less than this remains. */
  repeatMinWidth: 90,
  /** Room between one repeated label and the next, so a long name ellipsizes instead. */
  repeatGap: 12,
  barHeight: 10,
  /** How far the bar sits above the block's bottom edge, "over" it. */
  barRaise: 1,
  barMinWidth: 4,
} as const;

/** Where a set is drawn on its day's canvas: from its start, at least MIN_BLOCK_WIDTH wide. */
export function blockSpan(event: DbEvent, dayStart: number): { left: number; width: number } {
  const left = timeToX(event.dateFrom, dayStart);
  return { left, width: Math.max(MIN_BLOCK_WIDTH, timeToX(event.dateTo, dayStart) - left) };
}

export type BlockLabelModel = {
  name: string;
  /** "HH:MM–HH:MM". */
  time: string;
  fontSize: number;
  /** A one-word name keeps to one line; others may wrap to two. */
  lines: number;
  /** While the label repeats, the width every copy is held to; null otherwise. */
  segmentWidth: number | null;
  /** Further copies along a long block, from the first label's left. */
  repeats: { left: number; width: number }[];
};

export type ArtistBlockModel = {
  /** The set's eventId. */
  key: string;
  /** Handed back on a tap. */
  event: DbEvent;
  artist: DbArtist;
  left: number;
  top: number;
  width: number;
  height: number;
  bg: string;
  border: string;
  /** Null on a block too narrow to show one. */
  label: BlockLabelModel | null;
  /** My pick: the star shows for Maybe and Must-see only. */
  status: InterestStatus;
  /** One striped bar per overlap interval, from the block's left. */
  bars: { key: number; left: number; width: number }[];
};

export type ArtistBlockInputs = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  categoryColor: string;
  /** Gap between repeated labels on long blocks; scales with the viewport (labelRepeatPx). */
  labelRepeat: number;
  subRow: number;
  overlaps: ConflictOverlap[] | undefined;
};

function labelOf(artist: DbArtist, event: DbEvent, width: number, status: InterestStatus, labelRepeat: number): BlockLabelModel | null {
  if (width < BLOCK_LAYOUT.labelMinBlockWidth) {
    return null;
  }
  const lines = artist.name.indexOf(' ') === -1 ? 1 : 2;
  // The star takes width only when it is drawn.
  const labelWidth = width - BLOCK_LAYOUT.borderLeft - BLOCK_LAYOUT.padding * 2 - (isInterested(status) ? BLOCK_LAYOUT.starSize : 0);

  // Long blocks repeat their label so one is always near the viewport, offset
  // from the first label. A short block simply produces none.
  const segment = labelRepeat - BLOCK_LAYOUT.repeatGap;
  const repeats: { left: number; width: number }[] = [];
  for (let left = labelRepeat; left + BLOCK_LAYOUT.repeatMinWidth <= labelWidth; left += labelRepeat) {
    repeats.push({ left, width: Math.min(segment, labelWidth - left) });
  }
  const repeating = repeats.length > 0;

  // Every copy is sized alike, so a repeating block fits its font to one segment.
  return {
    name: artist.name,
    time: `${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`,
    fontSize: fitFontSize(artist.name.length, repeating ? Math.min(labelWidth, segment) : labelWidth, lines, BLOCK_FONT_SIZE),
    lines,
    segmentWidth: repeating ? segment : null,
    repeats,
  };
}

export function artistBlockModel({ event, artist, dayStart, status, categoryColor, labelRepeat, subRow, overlaps }: ArtistBlockInputs): ArtistBlockModel {
  const { left, width } = blockSpan(event, dayStart);
  const { bg, border } = categoryBlockColors(categoryColor);
  const bars = (overlaps ?? []).map((interval) => {
    const from = Math.max(0, Math.min(width, (interval.from - event.dateFrom) * PIXELS_PER_MS));
    const to = (interval.to - event.dateFrom) * PIXELS_PER_MS;
    return { key: interval.from, left: from, width: Math.max(BLOCK_LAYOUT.barMinWidth, Math.min(width, to) - from) };
  });
  return {
    key: event.eventId,
    event,
    artist,
    left,
    // A block fills its row exactly: the lane's bottom border is inside the
    // lane's height, and the gap between stacked rows is that border's width.
    top: subRow * LANE_HEIGHT,
    width,
    height: LANE_HEIGHT - LANE_BORDER_WIDTH,
    bg,
    border,
    label: labelOf(artist, event, width, status, labelRepeat),
    status,
    bars,
  };
}
