import { computeConflictEntries, computeConflictOverlaps, isConflictEligible, type ConflictInputs } from './conflictUtils';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import { planCapModel, type PlanCapModel } from '../components/plan/PlanCap.model';
import { planEmptyModel, type PlanEmptyModel } from '../components/plan/PlanEmpty.model';
import { planGapModel, type PlanGapModel } from '../components/plan/PlanGap.model';
import { planSetModel, type PlanSetModel } from '../components/plan/PlanSetRow.model';
import { ITEM_SPACING } from '../components/plan/planStyles';
import type { DbArtist, DbEvent } from '../types/backend';

// ── My plan: one festival day of the user's picks ─────────────────────────────
//
// Pure. buildPlanDay decides which elements a day lists and in what order; each
// element's own model (components/plan/*.model.ts) decides everything it shows,
// its height included, from the raw inputs handed to it here. Heights are
// deterministic, so the screen aims its scrolls (itemOffsets) without
// measuring. The visual spec is app/docs/frontend/design/my-plan.md.

export type PlanInputs = ConflictInputs;

type PlanOptions = {
  /** Unix ms of the shown festival day's 06:00. */
  dayStart: number;
  now: number;
  /** Whether today is a festival day. Outside the festival nothing is past, live or current. */
  duringFestival: boolean;
  showMaybe: boolean;
  conflictsOnly: boolean;
};

/** Room above a clash group for its "Conflict" title, when no gap or cap gives it. */
export type PlanSpacerItem = { kind: 'spacer'; key: string; height: number; conflictTitle: DbEvent };

export type PlanItem = PlanSetModel | PlanGapModel | PlanCapModel | PlanSpacerItem | PlanEmptyModel;

export const PLAN_LAYOUT = {
  paddingTop: 12,
  itemSpacing: ITEM_SPACING,
  spacer: 24,
} as const;

const HOUR_MS = 60 * 60 * 1000;

/**
 * A day's break window opens two hours after the 06:00 day boundary: 08:00. The
 * list's day-start break and the now pill's first countdown both start here.
 */
export const BREAK_WINDOW_OFFSET_MS = 2 * HOUR_MS;

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

/** Everything My plan lists for one festival day, top to bottom. */
export function buildPlanDay(
  interests: Record<string, string>,
  inputs: PlanInputs,
  { dayStart, now: wallNow, duringFestival, showMaybe, conflictsOnly }: PlanOptions,
): PlanItem[] {
  // Outside the festival the list reads as it does before it: every set is ahead.
  const now = duringFestival ? wallNow : Number.NEGATIVE_INFINITY;
  const overlaps = computeConflictOverlaps(interests, inputs);
  const entries = computeConflictEntries(interests, inputs);
  const leaders = new Set(entries.filter((e) => e.leader).map((e) => e.event.eventId));

  const allPicks = picksOf(interests, inputs);
  const dayPicks = allPicks.filter((p) => getFestivalDayStart(p.event.dateFrom) === dayStart);
  const liveMusts = allPicks
    .filter((p) => p.level === 'will_go' && p.event.dateFrom <= now && now < p.event.dateTo)
    .map((p) => p.event);
  const visible = dayPicks.filter((p) => {
    if (conflictsOnly) {
      return p.level === 'will_go' && overlaps.has(p.event.eventId);
    }
    return p.level === 'will_go' || showMaybe;
  });

  // No day title: the day switcher names the shown day.
  const items: PlanItem[] = [];

  // The day-start break: 08:00 → the first listed set (a Maybe when Maybes are
  // shown), drawn only while now is in it, in the start cap's place. Only on a
  // day with a Must-see, and never with only conflicts shown.
  const first = visible[0];
  const hasMust = dayPicks.some((p) => p.level === 'will_go');
  const opening = !conflictsOnly && hasMust && first !== undefined
    ? planGapModel('opening', dayStart + BREAK_WINDOW_OFFSET_MS, first.event, now, true, first.level)
    : null;
  // The day caps open and close the day; never with only conflicts shown.
  const caps = !conflictsOnly && visible.length > 0;
  if (opening !== null && opening.current) {
    items.push(opening);
  } else if (caps) {
    items.push(planCapModel('start'));
  }

  // The end of everything listed so far: a gap runs from it to the next set.
  let groupEnd: number | null = null;
  for (const { event, artist, level } of visible) {
    if (!conflictsOnly && groupEnd !== null && event.dateFrom > groupEnd) {
      items.push(planGapModel(`gap-${event.eventId}`, groupEnd, event, now, false, level));
    }

    const set = planSetModel({
      event,
      artist,
      stage: inputs.stages.find((s) => s.stageId === event.stageId),
      level,
      now,
      overlaps: overlaps.get(event.eventId) ?? [],
      liveMusts,
      conflictHead: leaders.has(event.eventId),
    });

    // A clash group's "Conflict" title is drawn by the cell right above its
    // first set (a cell cannot take touches outside its own bounds on Android):
    // the gap or cap there, or a spacer added to make room for it.
    if (set.conflictHead) {
      // Nothing above it (conflicts only, the day's first set): a spacer makes the room.
      const previous = items.at(-1);
      if (previous !== undefined && (previous.kind === 'gap' || previous.kind === 'cap')) {
        items[items.length - 1] = { ...previous, conflictTitle: event };
      } else {
        items.push({ kind: 'spacer', key: `spacer-${event.eventId}`, height: PLAN_LAYOUT.spacer, conflictTitle: event });
      }
    }
    items.push(set);

    groupEnd = groupEnd === null ? event.dateTo : Math.max(groupEnd, event.dateTo);
  }

  if (caps) {
    items.push(planCapModel('end'));
  }
  if (visible.length === 0) {
    items.push(planEmptyModel(conflictsOnly));
  }
  return items;
}

// ── Positions ─────────────────────────────────────────────────────────────────

/** Whether the white "now" arrow sits on this item. */
function hostsNow(item: PlanItem): boolean {
  return (item.kind === 'set' || item.kind === 'gap') && item.nowY !== null;
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

/** Index of the item whose top is at or above content offset `y`: the one a list scrolled to `y` shows first. */
export function itemAtOffset(items: PlanItem[], y: number): number {
  const offsets = itemOffsets(items);
  let index = 0;
  while (index + 1 < offsets.length && offsets[index + 1] <= y) {
    index += 1;
  }
  return index;
}

/** How many items a screen `height` tall shows, scrolled to `y`: from the one there down. */
export function itemsToFill(items: PlanItem[], y: number, height: number): number {
  const offsets = itemOffsets(items);
  let index = itemAtOffset(items, y);
  let count = 0;
  while (index < offsets.length && offsets[index] < y + height) {
    count += 1;
    index += 1;
  }
  return Math.max(1, count);
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
