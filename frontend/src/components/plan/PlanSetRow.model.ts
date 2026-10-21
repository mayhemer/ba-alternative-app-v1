import { eventsOverlap, type ConflictOverlap } from '../../utils/conflictUtils';
import { getStageLocalized } from '../../utils/localization';
import { formatTime } from '../timeline/timelineLayout';
import { formatRemaining, planStrings } from './planStrings';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── One set in My plan: what it shows ─────────────────────────────────────────
//
// Its state, its texts (time range, stage, status and countdown), the left
// progress fill, where the now arrow sits and its clash bars all come from the
// set and "now", plus what the plan knows about the other sets: where this one
// overlaps other Must-sees, and which Must-sees are live.

const strings = planStrings();

export const SET_ROW_HEIGHT = { must: 58, maybe: 26 } as const;

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
  level: 'will_go' | 'maybe';
  state: 'past' | 'live' | 'upcoming';
  /** "19:00–20:00" in festival time. */
  timeText: string;
  stageName: string;
  status: SetStatus;
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
  level: 'will_go' | 'maybe';
  /** -Infinity outside the festival: every set reads as ahead. */
  now: number;
  /** Where the set overlaps other Must-sees (computeConflictOverlaps). */
  overlaps: ConflictOverlap[];
  /** The Must-sees live now, on any day. */
  liveMusts: DbEvent[];
  /** It starts a clash group (computeConflictEntries' leader). */
  conflictHead: boolean;
};

function stateOf(event: DbEvent, now: number): PlanSetModel['state'] {
  if (now >= event.dateTo) {
    return 'past';
  }
  return event.dateFrom <= now ? 'live' : 'upcoming';
}

function statusOf(input: PlanSetInput, state: PlanSetModel['state']): SetStatus {
  const { event, level, now, liveMusts } = input;
  // A Maybe row has no status line, live or not.
  if (level === 'maybe') {
    return { kind: 'none' };
  }
  if (state === 'live') {
    return { kind: 'live', label: strings.live, time: formatRemaining(event.dateTo - now) };
  }
  if (state === 'past') {
    return { kind: 'done', label: strings.done };
  }
  // Upcoming, while a Must-see it clashes with is already playing: time to move.
  if (liveMusts.some((live) => live.eventId !== event.eventId && eventsOverlap(live, event))) {
    return { kind: 'start', label: strings.start, time: formatRemaining(event.dateFrom - now) };
  }
  return { kind: 'none' };
}

export function planSetModel(input: PlanSetInput): PlanSetModel {
  const { event, artist, stage, level, now } = input;
  const must = level === 'will_go';
  const state = stateOf(event, now);
  const duration = event.dateTo - event.dateFrom;
  const height = must ? SET_ROW_HEIGHT.must : SET_ROW_HEIGHT.maybe;
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
    status: statusOf(input, state),
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
