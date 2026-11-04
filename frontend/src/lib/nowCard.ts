import { formatTime, getFestivalDayStart, festivalToday } from '../utils/festivalTime';
import { getStageLocalized } from '../utils/localization';
import { clashesWithLive, computeConflictEntries, conflictGroupOf, type ConflictEntry, type ConflictInputs } from './conflictUtils';
import { BREAK_WINDOW_OFFSET_MS, liveMustSees, mustSeeSets, type PlannedSet } from './plan';
import { nowPillSet, todaysMusts } from './nowPillSet';

// ── The lock-screen now card ──────────────────────────────────────────────────
//
// What the card on the lock screen says (iOS Live Activity, Android ongoing
// notification). Spec: docs/frontend/design/lock-screen.md.
//   top row   — the now pill's set (nowPillSet): the latest live Must-see, or in
//               a break the next one;
//   clash row — while live, the next Must-see still to start that clashes with
//               one live now (My plan's START rule, clashesWithLive);
//   more      — in a clash group of three or more bands, how many of the group's
//               unfinished bands the card doesn't show.
//
// The native side never decides anything: nowCardScript precomputes every state
// of the whole festival with its time span, and the phone only picks the span
// holding "now" and draws it. Countdowns are drawn by the OS from the absolute
// times given here (start, end), so they need no updates.

/** One set as the card draws it: texts in festival time, times in Unix ms. */
export type NowCardSet = {
  eventId: string;
  name: string;
  stage: string;
  /** "19:00–20:00" in festival time. */
  timeText: string;
  start: number;
  end: number;
};

export type NowCardState =
  | { kind: 'break'; next: NowCardSet }
  | { kind: 'live'; live: NowCardSet; clash: NowCardSet | null; more: number };

/** A state and the time it holds: from (inclusive) to (exclusive), Unix ms. */
export type NowCardSegment = { from: number; to: number; state: NowCardState };

/** A clash group shows `⚠ +N` only from this many bands up. */
const MORE_FROM_GROUP_SIZE = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function cardSet({ event, artist }: PlannedSet, stageNames: Map<string, string>): NowCardSet {
  return {
    eventId: event.eventId,
    name: artist.name,
    stage: stageNames.get(event.stageId) ?? '',
    timeText: `${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`,
    start: event.dateFrom,
    end: event.dateTo,
  };
}

function stageNamesOf(inputs: ConflictInputs): Map<string, string> {
  return new Map(inputs.stages.map((s) => [s.stageId, getStageLocalized(s.localized, 'name')]));
}

function stateAt(
  interests: Record<string, string>,
  inputs: ConflictInputs,
  festivalDays: number[],
  now: number,
  entries: ConflictEntry[],
  stageNames: Map<string, string>,
): NowCardState | null {
  const set = nowPillSet(interests, inputs, festivalDays, now);
  if (set === null) {
    return null;
  }
  if (set.kind === 'break') {
    return { kind: 'break', next: cardSet(set.must, stageNames) };
  }
  const musts = todaysMusts(interests, inputs, getFestivalDayStart(now));
  const liveEvents = liveMustSees(musts, now).map((m) => m.event);
  const clash = musts
    .filter((m) => m.event.dateFrom > now && clashesWithLive(m.event, liveEvents))
    .sort((a, b) => a.event.dateFrom - b.event.dateFrom)[0];

  const group = conflictGroupOf(entries, set.must.event.eventId);
  const shown = new Set([set.must.event.eventId, clash?.event.eventId]);
  const more = group.length >= MORE_FROM_GROUP_SIZE
    ? group.filter((e) => !shown.has(e.eventId) && e.dateTo > now).length
    : 0;

  return {
    kind: 'live',
    live: cardSet(set.must, stageNames),
    clash: clash !== undefined ? cardSet(clash, stageNames) : null,
    more,
  };
}

/** What the card shows at `now`; null when it shows nothing (exactly when the now pill shows the logo). */
export function nowCardState(
  interests: Record<string, string>,
  inputs: ConflictInputs,
  festivalDays: number[],
  now: number,
): NowCardState | null {
  return stateAt(interests, inputs, festivalDays, now, computeConflictEntries(interests, inputs), stageNamesOf(inputs));
}

function sameSet(a: NowCardSet | null, b: NowCardSet | null): boolean {
  return a?.eventId === b?.eventId;
}

function sameState(a: NowCardState, b: NowCardState): boolean {
  if (a.kind === 'break' && b.kind === 'break') {
    return sameSet(a.next, b.next);
  }
  if (a.kind === 'live' && b.kind === 'live') {
    return sameSet(a.live, b.live) && sameSet(a.clash, b.clash) && a.more === b.more;
  }
  return false;
}

/**
 * Every state the card goes through over the festival, in order, each with its
 * time span; spans with nothing to show are left out, and neighbours that show
 * the same are merged. The state only changes at a day's 06:00 and 08:00 and at
 * a Must-see's start or end, so it is read once at each of those moments.
 */
export function nowCardScript(
  interests: Record<string, string>,
  inputs: ConflictInputs,
  festivalDays: number[],
): NowCardSegment[] {
  if (festivalDays.length === 0) {
    return [];
  }
  const entries = computeConflictEntries(interests, inputs);
  const stageNames = stageNamesOf(inputs);
  const lastDayEnd = Math.max(...festivalDays) + DAY_MS;
  const moments = new Set<number>([lastDayEnd]);
  for (const day of festivalDays) {
    moments.add(day);
    moments.add(day + BREAK_WINDOW_OFFSET_MS);
  }
  for (const { event } of mustSeeSets(interests, inputs)) {
    moments.add(event.dateFrom);
    moments.add(event.dateTo);
  }
  const bounds = [...moments].filter((t) => t <= lastDayEnd).sort((a, b) => a - b);

  const script: NowCardSegment[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const state = stateAt(interests, inputs, festivalDays, bounds[i], entries, stageNames);
    if (state === null) {
      continue;
    }
    const last = script[script.length - 1];
    if (last !== undefined && last.to === bounds[i] && sameState(last.state, state)) {
      last.to = bounds[i + 1];
    } else {
      script.push({ from: bounds[i], to: bounds[i + 1], state });
    }
  }
  return script;
}

/**
 * Whether to ask for Android's notification permission now: once, on a
 * festival day that still has a Must-see to show (live or to come).
 */
export function shouldAskNowCardPermission(
  script: NowCardSegment[],
  festivalDays: number[],
  now: number,
  alreadyAsked: boolean,
): boolean {
  if (alreadyAsked) {
    return false;
  }
  const today = festivalToday(festivalDays, now);
  if (today === null) {
    return false;
  }
  return script.some((seg) => seg.to > now && getFestivalDayStart(seg.from) === today);
}

/**
 * Whether two scripts would draw the same card at every moment: every span,
 * set, name, stage and time alike. A pick that changes nothing on the card (a
 * Maybe, say) leaves the native side alone.
 */
export function sameNowCardScript(a: NowCardSegment[], b: NowCardSegment[]): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
