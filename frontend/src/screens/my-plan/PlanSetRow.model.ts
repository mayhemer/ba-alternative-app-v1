import { clashesWithLive, type ConflictOverlap } from '../../lib/conflictUtils';
import type { PickLevel } from '../../lib/plan';
import { getStageLocalized } from '../../utils/localization';
import { formatTime } from '../../utils/festivalTime';
import { formatRemaining } from './planDurations';
import { strings } from '../../i18n/strings';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { LeftEdgeKind } from '../../ui/LeftEdge.model';

// ── One set in My plan: what it shows ─────────────────────────────────────────
//
// Its state, its texts (time range, stage, status and countdown), the left
// progress fill, where the now arrow sits and its clash bars all come from the
// set and "now", plus what the plan knows about the other sets: where this one
// overlaps other Must-sees, and which Must-sees are live. Its pick level and
// whether the list shows All sets decide its look:
//   - every row is two lines tall, except a Maybe outside All sets: one line;
//   - a Must-see is filled with its category's colour, a Maybe and an unpicked
//     set (All sets only) with the raised surface, a "don't go" (All sets only)
//     not at all, its text dimmed;
//   - under every filter a Must-see has a solid left edge in the category's
//     brighter colour and a Maybe a dotted grey one; the other rows have none;
//   - no row has a border, live or not;
//   - under All sets every row shows its pick's star, under the others none.

/** How the set is picked: Must-see, Maybe, not at all or "don't go" (the last two listed only under All sets). */
export type PlanSetLevel = PickLevel;

/** The two-line row, and the compact one-line row of a Maybe outside All sets. */
export const SET_ROW_HEIGHT = { tall: 58, compact: 26 } as const;

/** A row's background: its category's colour, the raised surface, or none (the list shows through). */
export type SetFill = 'category' | 'raised' | 'none';

/** A fraction of a set's duration, 0 = its start, 1 = its end. */
export type ClashBar = { from: number; to: number };

/** The status line of a Must-see: `LIVE −37 min`, `START −17 min`, `done`, or nothing. */
export type SetStatus =
  | { kind: 'live'; label: string; time: string }
  | { kind: 'start'; label: string; time: string }
  | { kind: 'done'; label: string }
  | { kind: 'none' };

export type PlanSetModel = {
  kind: 'set';
  key: string;
  event: DbEvent;
  artist: DbArtist;
  level: PlanSetLevel;
  state: 'past' | 'live' | 'upcoming';
  /** "19:00–20:00" in festival time. */
  timeText: string;
  stageName: string;
  status: SetStatus;
  /** One line, time · name · stage, with no status: a Maybe outside All sets. */
  compact: boolean;
  fill: SetFill;
  /** Its left edge, under every filter: solid in the category's brighter colour on a Must-see, dotted grey on a Maybe; on every other row null (transparent). */
  edge: LeftEdgeKind;
  /** Its texts in the muted grey: a "don't go". */
  dimmed: boolean;
  /** The pick's star at the right end of the name's line, under All sets only; else null. */
  star: InterestStatus | null;
  /** The live progress bar's colours (PROGRESS_COLORS): a Must-see's accent, every other set's grey. */
  progressColors: 'live' | 'maybeLive';
  accessibilityLabel: string;
  /** Elapsed fraction while live, else 0: the left fill. */
  progress: number;
  /** The now arrow's centre from the row's top while live, else null. */
  nowY: number | null;
  /** Where this Must-see overlaps other Must-sees; [] for a Maybe or no clash. */
  clashBars: ClashBar[];
  /** First set of a clash group: the "Conflict" title is drawn above it. */
  conflictHead: boolean;
  height: number;
};

export type PlanSetInput = {
  event: DbEvent;
  artist: DbArtist;
  stage: DbStage | undefined;
  level: PlanSetLevel;
  /** -Infinity outside the festival: every set reads as ahead. */
  now: number;
  /** Where the set overlaps other Must-sees (computeConflictOverlaps). */
  overlaps: ConflictOverlap[];
  /** The Must-sees live now, on any day. */
  liveMusts: DbEvent[];
  /** It starts a clash group (computeConflictEntries' leader). */
  conflictHead: boolean;
  /** The list shows All sets: every row two lines tall, with its star. */
  allSets: boolean;
};

function stateOf(event: DbEvent, now: number): PlanSetModel['state'] {
  if (now >= event.dateTo) {
    return 'past';
  }
  return event.dateFrom <= now ? 'live' : 'upcoming';
}

function fillOf(level: PlanSetLevel): SetFill {
  switch (level) {
    case 'will_go': return 'category';
    case 'maybe':
    case 'none': return 'raised';
    case 'dont_go': return 'none';
  }
}

function edgeOf(level: PlanSetLevel): PlanSetModel['edge'] {
  switch (level) {
    case 'will_go': return 'solid';
    case 'maybe': return 'dotted';
    default: return null;
  }
}

function statusOf(input: PlanSetInput, state: PlanSetModel['state'], compact: boolean): SetStatus {
  const { event, level, now, liveMusts } = input;
  // A compact row has no status line, live or not.
  if (compact) {
    return { kind: 'none' };
  }
  if (state === 'live') {
    return { kind: 'live', label: strings().setStatus.live, time: formatRemaining(event.dateTo - now) };
  }
  if (state === 'past') {
    return { kind: 'done', label: strings().setStatus.done };
  }
  // Upcoming, while a Must-see it clashes with is already playing: time to move.
  // Only a Must-see clashes; no other set ever counts down to its start.
  if (level === 'will_go' && clashesWithLive(event, liveMusts)) {
    return { kind: 'start', label: strings().setStatus.start, time: formatRemaining(event.dateFrom - now) };
  }
  return { kind: 'none' };
}

export function planSetModel(input: PlanSetInput): PlanSetModel {
  const { event, artist, stage, level, now, allSets } = input;
  const must = level === 'will_go';
  const compact = level === 'maybe' && !allSets;
  const state = stateOf(event, now);
  const duration = event.dateTo - event.dateFrom;
  const height = compact ? SET_ROW_HEIGHT.compact : SET_ROW_HEIGHT.tall;
  const progress = state === 'live' ? (now - event.dateFrom) / duration : 0;
  const timeText = `${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`;
  const stageName = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
  return {
    kind: 'set',
    key: event.eventId,
    event,
    artist,
    level,
    state,
    timeText,
    stageName,
    status: statusOf(input, state, compact),
    compact,
    fill: fillOf(level),
    edge: edgeOf(level),
    dimmed: level === 'dont_go',
    // The levels are the interest statuses the stars show.
    star: allSets ? level : null,
    progressColors: must ? 'live' : 'maybeLive',
    accessibilityLabel: `${artist.name}, ${timeText}, ${stageName}`,
    progress,
    nowY: state === 'live' ? progress * height : null,
    // A Maybe never clashes: conflicts are between Must-sees only.
    clashBars: must
      ? input.overlaps.map((iv) => ({ from: (iv.from - event.dateFrom) / duration, to: (iv.to - event.dateFrom) / duration }))
      : [],
    conflictHead: must && input.conflictHead,
    height,
  };
}
