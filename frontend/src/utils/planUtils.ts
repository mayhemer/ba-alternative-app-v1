import { computeConflictEntries, computeConflictOverlaps, eventsOverlap, isConflictEligible, type ConflictInputs } from './conflictUtils';
import { getStageLocalized } from './localization';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import type { DbArtist, DbEvent } from '../types/backend';

// ── My plan: one festival day of the user's picks ─────────────────────────────
//
// Pure: everything the screen shows for a day is computed here from the
// interests, the cache inputs and "now", with deterministic heights, so the
// screen can lay the list out (getItemLayout) and aim scrolls without measuring.
// The visual spec is app/MY-PLAN-VIEW-DESIGN.md.

export type PlanInputs = ConflictInputs;

export type PlanOptions = {
  /** Unix ms of the shown festival day's 06:00. */
  dayStart: number;
  now: number;
  showMaybe: boolean;
  conflictsOnly: boolean;
};

/** A fraction of a set's duration, 0 = its start, 1 = its end. */
export type ClashBar = { from: number; to: number };

export type PlanSetItem = {
  kind: 'set';
  key: string;
  event: DbEvent;
  artist: DbArtist;
  stageName: string;
  level: 'will_go' | 'maybe';
  state: 'past' | 'live' | 'upcoming';
  /** Elapsed fraction while live, else 0. */
  progress: number;
  /** Time left while live, else 0. */
  remainingMs: number;
  /** Where this Must-see overlaps other Must-sees; [] for a Maybe or no clash. */
  clashBars: ClashBar[];
  /** First set of a clash group: carries the "Conflict" title. */
  conflictHead: boolean;
  /** The sets it clashes with, for the conflict detail sheet. */
  overlappingEvents: DbEvent[];
  /** Upcoming Must-see clashing with a Must-see live now: time until it starts. */
  startsInMs: number | null;
  height: number;
};

export type PlanGapItem = {
  kind: 'gap';
  key: string;
  minutes: number;
  /** "Now" falls inside it. */
  current: boolean;
  /** The day-start break (08:00 → the first Must-see). */
  opening: boolean;
  /** Elapsed fraction while current, else 0. */
  progress: number;
  /** Time until it ends while current, else 0. */
  remainingMs: number;
  height: number;
};

export type PlanTitleItem = { kind: 'title'; key: 'title'; dayStart: number; height: number };
export type PlanSpacerItem = { kind: 'spacer'; key: string; height: number };
export type PlanEmptyItem = { kind: 'empty'; key: 'empty'; height: number };

export type PlanItem = PlanTitleItem | PlanSetItem | PlanGapItem | PlanSpacerItem | PlanEmptyItem;

export const PLAN_LAYOUT = {
  paddingTop: 12,
  itemSpacing: 6,
  title: 32,
  mustRow: 58,
  maybeRow: 26,
  /** Room above a clash group for its floating title when no gap gives it. */
  spacer: 24,
  empty: 90,
  /** A current gap is at least this tall, to fit its countdown. */
  currentGapMin: 44,
} as const;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** The day-start break begins two hours after the 06:00 day boundary: 08:00. */
const OPENING_BREAK_OFFSET_MS = 2 * HOUR_MS;

const GAP_MIN_HEIGHT = 20;
const GAP_MAX_HEIGHT = 160;
const GAP_PX_PER_MINUTE = 0.5;

/**
 * Height of a gap: a floor that always fits its label, then linear, so a 35 min
 * gap (38) and a 2 h one (80) read clearly apart. Compressing curves (√, ln)
 * were tried and made them look alike.
 */
export function gapHeight(minutes: number): number {
  return Math.round(Math.min(GAP_MAX_HEIGHT, GAP_MIN_HEIGHT + GAP_PX_PER_MINUTE * minutes));
}

/**
 * The day My plan shows by default: today on a festival day; before the festival
 * the first day, after it the last; between days, the next one. 0 when the
 * edition has no days.
 */
export function defaultPlanDay(festivalDays: number[], now: number): number {
  if (festivalDays.length === 0) {
    return 0;
  }
  const today = getFestivalDayStart(now);
  return festivalDays.find((day) => day >= today) ?? festivalDays[festivalDays.length - 1];
}

// ── Picks ─────────────────────────────────────────────────────────────────────

type Pick = { event: DbEvent; artist: DbArtist; level: 'will_go' | 'maybe' };

function picksOf(interests: Record<string, string>, { artists, artistEvents }: PlanInputs): Pick[] {
  const picks: Pick[] = [];
  for (const artist of artists) {
    const status = interests[artist.artistId];
    if (status !== 'will_go' && status !== 'maybe') {
      continue;
    }
    // Only the sets the conflict calculation considers: one shared rule, so the
    // plan never lists a set that cannot clash (or hides one that can).
    for (const event of (artistEvents[artist.artistId] ?? []).filter(isConflictEligible)) {
      picks.push({ event, artist, level: status });
    }
  }
  return picks.sort((a, b) => a.event.dateFrom - b.event.dateFrom);
}

// ── Building a day ────────────────────────────────────────────────────────────

function stageNameOf(stageId: string, inputs: PlanInputs): string {
  const stage = inputs.stages.find((s) => s.stageId === stageId);
  return stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
}

function currentGap(key: string, from: number, to: number, now: number, opening: boolean): PlanGapItem {
  const minutes = Math.round((to - from) / MINUTE_MS);
  return {
    kind: 'gap',
    key,
    minutes,
    current: true,
    opening,
    progress: (now - from) / (to - from),
    remainingMs: to - now,
    height: Math.max(PLAN_LAYOUT.currentGapMin, gapHeight(minutes)),
  };
}

/** Everything My plan lists for one festival day, top to bottom. */
export function buildPlanDay(
  interests: Record<string, string>,
  inputs: PlanInputs,
  { dayStart, now, showMaybe, conflictsOnly }: PlanOptions,
): PlanItem[] {
  const overlaps = computeConflictOverlaps(interests, inputs);
  const entries = computeConflictEntries(interests, inputs);
  const leaders = new Set(entries.filter((e) => e.leader).map((e) => e.event.eventId));
  const overlappingById = new Map(entries.map((e) => [e.event.eventId, e.overlappingEvents]));

  const allPicks = picksOf(interests, inputs);
  const dayPicks = allPicks.filter((p) => getFestivalDayStart(p.event.dateFrom) === dayStart);
  const mustsLiveNow = allPicks.filter((p) => p.level === 'will_go' && p.event.dateFrom <= now && now < p.event.dateTo);
  const visible = dayPicks.filter((p) => {
    if (conflictsOnly) {
      return p.level === 'will_go' && overlaps.has(p.event.eventId);
    }
    return p.level === 'will_go' || showMaybe;
  });

  const isToday = getFestivalDayStart(now) === dayStart;
  const items: PlanItem[] = [{ kind: 'title', key: 'title', dayStart, height: PLAN_LAYOUT.title }];

  // The day-start break: 08:00 → the day's first Must-see, while now is in it.
  const firstMust = dayPicks.find((p) => p.level === 'will_go');
  const breakFrom = dayStart + OPENING_BREAK_OFFSET_MS;
  if (!conflictsOnly && isToday && firstMust !== undefined && now >= breakFrom && now < firstMust.event.dateFrom) {
    items.push(currentGap('opening', breakFrom, firstMust.event.dateFrom, now, true));
  }

  let groupEnd: number | null = null;
  for (const pick of visible) {
    const { event, artist, level } = pick;

    if (!conflictsOnly && groupEnd !== null && event.dateFrom > groupEnd) {
      const minutes = Math.round((event.dateFrom - groupEnd) / MINUTE_MS);
      if (now >= groupEnd && now < event.dateFrom) {
        items.push(currentGap(`gap-${event.eventId}`, groupEnd, event.dateFrom, now, false));
      } else {
        items.push({
          kind: 'gap',
          key: `gap-${event.eventId}`,
          minutes,
          current: false,
          opening: false,
          progress: 0,
          remainingMs: 0,
          height: gapHeight(minutes),
        });
      }
    }

    // The group title floats above the first set of a clash group; when no gap
    // gives it room, reserve some so it never covers the item above.
    const conflictHead = level === 'will_go' && leaders.has(event.eventId);
    const previous = items[items.length - 1];
    if (conflictHead && previous.kind !== 'gap') {
      items.push({ kind: 'spacer', key: `spacer-${event.eventId}`, height: PLAN_LAYOUT.spacer });
    }

    const live = event.dateFrom <= now && now < event.dateTo;
    const duration = event.dateTo - event.dateFrom;
    const clashBars: ClashBar[] = level === 'will_go'
      ? (overlaps.get(event.eventId) ?? []).map((iv) => ({
          from: (iv.from - event.dateFrom) / duration,
          to: (iv.to - event.dateFrom) / duration,
        }))
      : [];
    const clashesWithLive = level === 'will_go' && now < event.dateFrom
      && mustsLiveNow.some((l) => l.event.eventId !== event.eventId && eventsOverlap(l.event, event));

    let state: PlanSetItem['state'] = 'upcoming';
    if (now >= event.dateTo) {
      state = 'past';
    } else if (live) {
      state = 'live';
    }

    items.push({
      kind: 'set',
      key: event.eventId,
      event,
      artist,
      stageName: stageNameOf(event.stageId, inputs),
      level,
      state,
      progress: live ? (now - event.dateFrom) / duration : 0,
      remainingMs: live ? event.dateTo - now : 0,
      clashBars,
      conflictHead,
      overlappingEvents: overlappingById.get(event.eventId) ?? [],
      startsInMs: clashesWithLive ? event.dateFrom - now : null,
      height: level === 'will_go' ? PLAN_LAYOUT.mustRow : PLAN_LAYOUT.maybeRow,
    });

    groupEnd = groupEnd === null ? event.dateTo : Math.max(groupEnd, event.dateTo);
  }

  if (visible.length === 0) {
    items.push({ kind: 'empty', key: 'empty', height: PLAN_LAYOUT.empty });
  }
  return items;
}

// ── Positions ─────────────────────────────────────────────────────────────────

/** Whether the white "now" arrow sits on this item. */
export function hostsNow(item: PlanItem): boolean {
  switch (item.kind) {
    case 'set': return item.state === 'live';
    case 'gap': return item.current;
    default: return false;
  }
}

/** Top y of each item in the list's content, padding and spacing included. */
export function itemOffsets(items: PlanItem[]): number[] {
  const offsets: number[] = [];
  let y = PLAN_LAYOUT.paddingTop;
  for (const item of items) {
    offsets.push(y);
    y += item.height + PLAN_LAYOUT.itemSpacing;
  }
  return offsets;
}

/**
 * Scroll offset that puts the item carrying "now" about a third from the top of
 * a viewport of the given height; null when "now" is not on the shown day.
 */
export function nowScrollOffset(items: PlanItem[], viewportHeight: number): number | null {
  const index = items.findIndex(hostsNow);
  if (index === -1) {
    return null;
  }
  return Math.max(0, itemOffsets(items)[index] - viewportHeight / 3);
}

/** The festival days (06:00 starts) with at least one Must-see clash. */
export function daysWithClash(interests: Record<string, string>, inputs: PlanInputs): Set<number> {
  const days = new Set<number>();
  for (const entry of computeConflictEntries(interests, inputs)) {
    days.add(getFestivalDayStart(entry.event.dateFrom));
  }
  return days;
}
