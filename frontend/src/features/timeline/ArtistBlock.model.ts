import type { DbArtist, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../../lib/conflictUtils';
import { isInterested } from '../../lib/interestUtils';
import { fitText } from '../../ui/textFit';
import { equalValues } from '../../ui/sameProps';
import { categoryBlockColors } from '../../utils/color';
import { BLOCK_FONT_SIZE, LANE_BORDER_WIDTH, LANE_HEIGHT, MIN_BLOCK_WIDTH, PIXELS_PER_MS, timeToX } from './timelineLayout';
import { formatTime } from '../../utils/festivalTime';
import { LEFT_EDGE_WIDTH, type LeftEdgeKind } from '../../ui/LeftEdge.model';

// ── A set's block on the timeline: what it shows ──────────────────────────────
//
// Everything a block shows comes from its set, its day and its row: where it
// sits and how wide it is (its times, less a 1 px separator when the next set
// in its row starts right at its end), the label and how large it can be (that
// width), the star and the look (my pick: a Must-see's solid left edge, a
// Maybe's dotted one, none on an unpicked set, a "don't go" outlined, not
// filled), and one striped bar per overlap interval, each over just the
// overlapping part. ArtistBlock draws only this.

export const BLOCK_LAYOUT = {
  /** Inner padding; the label width maths below subtracts it. */
  padding: 8,
  /** Room for a pick's left edge, kept on every block, so the label sits alike with or without one. */
  borderLeft: LEFT_EDGE_WIDTH,
  /** A "don't go": a dotted grey frame all round, no stage colour, and its text dimmed. */
  mutedEdge: '#4d4d4d',
  mutedEdgeWidth: 1,
  mutedEdgeStyle: 'dotted',
  mutedTextOpacity: 0.3,
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
  /** Cut from a block's end when the next set in its row starts right then: the lane's surface shows through. */
  separator: 1,
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
  /** A one-word name keeps to one line; others may wrap to two, at word boundaries, or keep to one when a word would not fit a line (ui/textFit). */
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
  /** The fill; 'transparent' on a "don't go". */
  bg: string;
  /** My pick's left edge: solid on a Must-see, dotted on a Maybe, none otherwise. */
  leftEdge: LeftEdgeKind;
  /** The left edge's colour: the stage's, brighter. */
  border: string;
  /** A "don't go"'s frame colour, all round; null otherwise. */
  frame: string | null;
  /** The label's opacity: dimmed on a "don't go". */
  textOpacity: number;
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
  /** The next set in its row starts right at its end (CategoryLane.model). */
  abutsNext: boolean;
};

function leftEdgeOf(status: InterestStatus): LeftEdgeKind {
  switch (status) {
    case 'will_go': return 'solid';
    case 'maybe': return 'dotted';
    case 'none':
    case 'dont_go': return null;
  }
}

function labelOf(artist: DbArtist, event: DbEvent, width: number, status: InterestStatus, labelRepeat: number): BlockLabelModel | null {
  if (width < BLOCK_LAYOUT.labelMinBlockWidth) {
    return null;
  }
  const maxLines = artist.name.indexOf(' ') === -1 ? 1 : 2;
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
  const { fontSize, lines } = fitText(artist.name, repeating ? Math.min(labelWidth, segment) : labelWidth, maxLines, BLOCK_FONT_SIZE);
  return {
    name: artist.name,
    time: `${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`,
    fontSize,
    lines,
    segmentWidth: repeating ? segment : null,
    repeats,
  };
}

export function artistBlockModel(inputs: ArtistBlockInputs): ArtistBlockModel {
  return blockModel(inputs, undefined);
}

function blockModel(inputs: ArtistBlockInputs, previous: AskedBefore | undefined): ArtistBlockModel {
  const { event, artist, dayStart, status, categoryColor, subRow, overlaps, abutsNext } = inputs;
  const span = blockSpan(event, dayStart);
  const left = span.left;
  // Back to back with the next set, a 1 px separator is cut from its end.
  const width = abutsNext ? span.width - BLOCK_LAYOUT.separator : span.width;
  const { bg, border } = categoryBlockColors(categoryColor);
  const muted = status === 'dont_go';
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
    bg: muted ? 'transparent' : bg,
    leftEdge: leftEdgeOf(status),
    border,
    frame: muted ? BLOCK_LAYOUT.mutedEdge : null,
    textOpacity: muted ? BLOCK_LAYOUT.mutedTextOpacity : 1,
    label: labelFor(inputs, width, previous),
    status,
    bars,
  };
}

// ── The same set's model, asked again ─────────────────────────────────────────
//
// A lane asks for its blocks' models on every render: each step of a day's
// progressive mount, a pick, a sync. Most of its sets are unchanged, so the
// model each one got last time is handed back, the same object, and its block's
// memo skips it at the first comparison. A set whose inputs did change gets a
// new model, keeping its label (the font fit, the time) unless the label's own
// inputs changed: only the star coming or going changes it with a pick.
//
// Keyed by the set's record: the cache store hands out the same record until a
// sync replaces it, and a replaced one's entry goes with it.

type AskedBefore = { inputs: ArtistBlockInputs; model: ArtistBlockModel };

/**
 * The label the set showed last time, while its name, its width, the star
 * (whether it takes room) and the repeat gap are the same; else laid out anew.
 */
function labelFor({ event, artist, status, labelRepeat }: ArtistBlockInputs, width: number, previous: AskedBefore | undefined): BlockLabelModel | null {
  if (previous !== undefined
    && previous.inputs.artist.name === artist.name
    && previous.model.width === width
    && isInterested(previous.inputs.status) === isInterested(status)
    && previous.inputs.labelRepeat === labelRepeat) {
    return previous.model.label;
  }
  return labelOf(artist, event, width, status, labelRepeat);
}

const askedBefore = new WeakMap<DbEvent, AskedBefore>();

function sameInputs(a: ArtistBlockInputs, b: ArtistBlockInputs): boolean {
  return a.artist === b.artist
    && a.dayStart === b.dayStart
    && a.status === b.status
    && a.categoryColor === b.categoryColor
    && a.labelRepeat === b.labelRepeat
    && a.subRow === b.subRow
    && a.abutsNext === b.abutsNext
    // Rebuilt with the conflicts on every pick: compared by value.
    && equalValues(a.overlaps, b.overlaps);
}

/** artistBlockModel, the same object again while the set's inputs are the same. */
export function cachedArtistBlockModel(inputs: ArtistBlockInputs): ArtistBlockModel {
  const previous = askedBefore.get(inputs.event);
  if (previous !== undefined && sameInputs(previous.inputs, inputs)) {
    return previous.model;
  }
  const model = blockModel(inputs, previous);
  askedBefore.set(inputs.event, { inputs, model });
  return model;
}
