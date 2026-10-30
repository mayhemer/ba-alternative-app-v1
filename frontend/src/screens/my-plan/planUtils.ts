import { computeConflictEntries, computeConflictOverlaps, isConflictEligible, type ConflictInputs } from '../../features/conflicts/conflictUtils';
import { getFestivalDayStart } from '../../utils/festivalTime';
import { planCapModel, type PlanCapModel } from './PlanCap.model';
import { planEmptyModel, type PlanEmptyModel } from './PlanEmpty.model';
import { planGapModel, type PlanGapModel } from './PlanGap.model';
import { planSetModel, type PlanSetLevel, type PlanSetModel } from './PlanSetRow.model';
import { ITEM_SPACING } from './planStyles';
import type { PlanLevel } from '../../store/uiStatePersistence';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── My plan: one festival day of the user's picks ─────────────────────────────
//
// Pure. buildPlanDay decides which elements a day lists and in what order; each
// element's own model (screens/my-plan/*.model.ts) decides everything it shows,
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
  /** The filter: All sets, Must-see and Maybe, Must-see only, Only conflicts. */
  level: PlanLevel;
};

/** Room above a clash group for its "Conflict" title, when no gap or cap gives it. */
export type PlanSpacerItem = { kind: 'spacer'; key: string; height: number; conflictTitle: DbEvent };

export type PlanItem = PlanSetModel | PlanGapModel | PlanCapModel | PlanSpacerItem | PlanEmptyModel;

export const PLAN_LAYOUT = {
  paddingTop: 12,
  /** Below the last item, before the floating bottom bar's clearance. */
  paddingBottom: 24,
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

type Pick = { event: DbEvent; artist: DbArtist; level: PlanSetLevel };

/**
 * The sets My plan can list, by start: your Must-see and Maybe picks, and with
 * `unpicked` also every Program band's set you haven't picked (All sets). Never
 * a "don't go" pick, and never an unpicked support-programme item.
 */
function picksOf(interests: Record<string, string>, { artists, artistEvents }: PlanInputs, unpicked: boolean): Pick[] {
  const picks: Pick[] = [];
  for (const artist of artists) {
    const status = interests[artist.artistId];
    let level: PlanSetLevel;
    if (status === 'will_go' || status === 'maybe') {
      level = status;
    } else if (unpicked && status !== 'dont_go' && artist.isPlayable) {
      level = 'none';
    } else {
      continue;
    }
    // Only the sets the conflict calculation considers: one shared rule, so the
    // plan never lists a set that cannot clash (or hides one that can).
    for (const event of (artistEvents[artist.artistId] ?? []).filter(isConflictEligible)) {
      picks.push({ event, artist, level });
    }
  }
  return picks.sort((a, b) => a.event.dateFrom - b.event.dateFrom);
}

// ── Building a day ────────────────────────────────────────────────────────────

/** Everything My plan lists for one festival day, top to bottom. */
export function buildPlanDay(
  interests: Record<string, string>,
  inputs: PlanInputs,
  { dayStart, now: wallNow, duringFestival, level }: PlanOptions,
): PlanItem[] {
  // Outside the festival the list reads as it does before it: every set is ahead.
  const now = duringFestival ? wallNow : Number.NEGATIVE_INFINITY;
  const overlaps = computeConflictOverlaps(interests, inputs);
  const entries = computeConflictEntries(interests, inputs);
  const leaders = new Set(entries.filter((e) => e.leader).map((e) => e.event.eventId));

  const conflictsOnly = level === 'conflicts';
  const allPicks = picksOf(interests, inputs, level === 'all');
  const dayPicks = allPicks.filter((p) => getFestivalDayStart(p.event.dateFrom) === dayStart);
  const liveMusts = allPicks
    .filter((p) => p.level === 'will_go' && p.event.dateFrom <= now && now < p.event.dateTo)
    .map((p) => p.event);
  const visible = dayPicks.filter((p) => {
    if (conflictsOnly) {
      return p.level === 'will_go' && overlaps.has(p.event.eventId);
    }
    if (p.level === 'maybe') {
      return level === 'maybe' || level === 'all';
    }
    return p.level === 'will_go' || level === 'all';
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
  for (const { event, artist, level: pickLevel } of visible) {
    if (!conflictsOnly && groupEnd !== null && event.dateFrom > groupEnd) {
      items.push(planGapModel(`gap-${event.eventId}`, groupEnd, event, now, false, pickLevel));
    }

    const set = planSetModel({
      event,
      artist,
      stage: inputs.stages.find((s) => s.stageId === event.stageId),
      level: pickLevel,
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

  if (caps && groupEnd !== null) {
    items.push(planCapModel('end', { listedEnd: groupEnd, dayStart, now }));
  }
  if (visible.length === 0) {
    items.push(planEmptyModel(conflictsOnly));
  }
  return items;
}

// ── Positions ─────────────────────────────────────────────────────────────────

/** Whether the red "now" arrow sits on this item. */
function hostsNow(item: PlanItem): boolean {
  return (item.kind === 'set' || item.kind === 'gap' || item.kind === 'cap') && item.nowY !== null;
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

/**
 * How central the now arrow must be for the now pill on My plan to go to the
 * timeline rather than scroll to now: the middle 80 % of the list above the
 * floating bottom bar (planNowInView).
 */
export const PLAN_NOW_BAND = 0.8;

/** Where now is on the scrolled list, in content y. */
export type PlanNowView = {
  /** Where the first now arrow is drawn; null when none is. */
  now: number | null;
  /** The scroll offset. */
  scroll: number;
  /** How much of the list is visible above the floating bottom bar. */
  size: number;
  /** Where a scroll to now goes, as far as the list can scroll. */
  nowScroll: number;
};

/**
 * Whether now is in My plan's view: the arrow is drawn inside the central
 * PLAN_NOW_BAND of the visible list, or a scroll to now would not move the list
 * (it cannot get any closer: an arrow near the top or the end, or none).
 */
export function planNowInView({ now, scroll, size, nowScroll }: PlanNowView): boolean {
  const margin = (size * (1 - PLAN_NOW_BAND)) / 2;
  if (now !== null && now >= scroll + margin && now <= scroll + size - margin) {
    return true;
  }
  return Math.abs(nowScroll - scroll) < 1;
}

/**
 * Now on a day's list scrolled to `scrollY`, in content y: where the first now
 * arrow is (null when none is drawn), how much is visible above the floating
 * bottom bar (`bottomInset`, its clearance, also added below the content), and
 * where a scroll to now goes (nowScrollOffset, the top when there is no arrow),
 * held within what the list can scroll. The now pill reads it (planNowInView).
 */
export function planNowView(
  items: PlanItem[],
  { scrollY, viewportHeight, bottomInset }: { scrollY: number; viewportHeight: number; bottomInset: number },
): PlanNowView {
  const offsets = itemOffsets(items);
  const index = items.findIndex(hostsNow);
  let now: number | null = null;
  if (index !== -1) {
    const host = items[index];
    if (host.kind === 'set' || host.kind === 'gap' || host.kind === 'cap') {
      now = offsets[index] + (host.nowY ?? 0);
    }
  }
  const last = items.length - 1;
  const contentEnd = last === -1 ? PLAN_LAYOUT.paddingTop : offsets[last] + items[last].height + PLAN_LAYOUT.itemSpacing;
  const contentHeight = contentEnd + PLAN_LAYOUT.paddingBottom + bottomInset;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  return {
    now,
    scroll: scrollY,
    size: viewportHeight - bottomInset,
    nowScroll: Math.min(nowScrollOffset(items, viewportHeight) ?? 0, maxScroll),
  };
}

/** The festival days (06:00 starts) with at least one Must-see clash. */
export function daysWithClash(interests: Record<string, string>, inputs: PlanInputs): Set<number> {
  const days = new Set<number>();
  for (const entry of computeConflictEntries(interests, inputs)) {
    days.add(getFestivalDayStart(entry.event.dateFrom));
  }
  return days;
}
