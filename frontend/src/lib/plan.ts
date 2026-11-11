import type { DbArtistEventMap } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';

// ── The sets a pick puts on the plan ──────────────────────────────────────────
//
// One rule for the conflict calculation, My plan's list, the now pill and the
// now card: which of a pick's sets count at all. They all start here, so whatever one counts or
// leaves out, the others do the same.

const HOUR_MS = 60 * 60 * 1000;
const SUPPORT_SET_DURATION_MAX_FOR_PLAN_MS = 2 * HOUR_MS;

/**
 * A day's break window opens two hours after the 06:00 day boundary: 08:00. My
 * plan's day-start break and the now pill's first countdown both start here.
 */
export const BREAK_WINDOW_OFFSET_MS = 2 * HOUR_MS;

/**
 * Whether a set is on the plan at all: a band's set of any length, a support-
 * programme set up to two hours. Longer support sets are things like all-day
 * exhibitions, which would clash with everything.
 *
 * The one eligibility rule shared by the conflict calculation, My plan's list,
 * the now pill and the now card: the plan lists exactly the sets considered
 * here, so they never disagree. Change it here, for all of them.
 */
export function isPlanEligible(event: DbEvent, artist: DbArtist): boolean {
  return artist.isPlayable || event.dateTo - event.dateFrom <= SUPPORT_SET_DURATION_MAX_FOR_PLAN_MS;
}

/** How a set is on the plan: a Must-see, a Maybe, or (All sets) a band not picked or marked "don't go". */
export type PickLevel = 'will_go' | 'maybe' | 'none' | 'dont_go';

export type PlannedSet = { event: DbEvent; artist: DbArtist; level: PickLevel };

type PickInputs = { artists: DbArtist[]; artistEvents: DbArtistEventMap };

/** Each eligible set of each artist `levelOf` gives a level, in the lineup's order. */
function plannedSets(
  { artists, artistEvents }: PickInputs,
  levelOf: (artist: DbArtist) => PickLevel | null,
): PlannedSet[] {
  const sets: PlannedSet[] = [];
  for (const artist of artists) {
    const level = levelOf(artist);
    if (level === null) {
      continue;
    }
    for (const event of artistEvents[artist.artistId] ?? []) {
      if (isPlanEligible(event, artist)) {
        sets.push({ event, artist, level });
      }
    }
  }
  return sets;
}

/** The Must-sees' sets, in the lineup's order: what the conflicts pair, and what the now pill names. */
export function mustSeeSets(interests: Record<string, string>, inputs: PickInputs): PlannedSet[] {
  return plannedSets(inputs, (artist) => (interests[artist.artistId] === 'will_go' ? 'will_go' : null));
}

/**
 * The sets My plan can list, by start: your Must-see and Maybe picks, and with
 * `unpicked` also every other band's set (All sets): not picked, or marked
 * "don't go", listed so that a pick changed by mistake is easy to undo. Never
 * an unpicked or "don't go" support-programme item.
 */
export function planPicks(interests: Record<string, string>, inputs: PickInputs, unpicked: boolean): PlannedSet[] {
  const sets = plannedSets(inputs, (artist) => {
    const status = interests[artist.artistId];
    if (status === 'will_go' || status === 'maybe') {
      return status;
    }
    if (!unpicked || !artist.isPlayable) {
      return null;
    }
    return status === 'dont_go' ? 'dont_go' : 'none';
  });
  return sets.sort((a, b) => a.event.dateFrom - b.event.dateFrom);
}

/** My plan's filter: Only conflicts, Must-see only, Must-see and Maybe, All sets. */
export type PlanFilterLevel = 'conflicts' | 'must' | 'maybe' | 'all';

/**
 * Whether My plan's filter `level` lists one of planPicks' sets, by its pick
 * level and whether it clashes (the shared conflict calculation). The one rule
 * the list (buildPlanDay) and search follow.
 */
export function planLevelLists(level: PlanFilterLevel, pick: PickLevel, clashing: boolean): boolean {
  if (level === 'conflicts') {
    return pick === 'will_go' && clashing;
  }
  if (pick === 'maybe') {
    return level === 'maybe' || level === 'all';
  }
  // An unpicked or "don't go" set: under All sets only.
  return pick === 'will_go' || level === 'all';
}

/**
 * The Must-sees playing at `now`, from their first minute to before their last,
 * in the order given. The one "live" rule of My plan's list and the now pill.
 */
export function liveMustSees(sets: PlannedSet[], now: number): PlannedSet[] {
  return sets.filter((s) => s.level === 'will_go' && s.event.dateFrom <= now && now < s.event.dateTo);
}
