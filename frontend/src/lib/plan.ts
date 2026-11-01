import type { DbArtistEventMap } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';

// ── The sets a pick puts on the plan ──────────────────────────────────────────
//
// One rule for the conflict calculation, My plan's list and the now pill: which
// of a pick's sets count at all. They all start here, so whatever one counts or
// leaves out, the others do the same.

const HOUR_MS = 60 * 60 * 1000;
const EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS = 2 * HOUR_MS;

/**
 * A day's break window opens two hours after the 06:00 day boundary: 08:00. My
 * plan's day-start break and the now pill's first countdown both start here.
 */
export const BREAK_WINDOW_OFFSET_MS = 2 * HOUR_MS;

/**
 * Whether a set takes part in conflicts at all: no longer than two hours. Longer
 * ones are things like all-day exhibitions, which clash with everything.
 *
 * The one eligibility rule shared by the conflict calculation, My plan's list
 * and the now pill: the plan lists exactly the sets considered here, so they
 * never disagree. Change it here, for all of them.
 */
export function isConflictEligible(event: DbEvent): boolean {
  return event.dateTo - event.dateFrom <= EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS;
}

/** How a set is on the plan: a Must-see, a Maybe, or (All sets) a band not picked. */
export type PickLevel = 'will_go' | 'maybe' | 'none';

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
      if (isConflictEligible(event)) {
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
 * `unpicked` also every band's set you haven't picked (All sets). Never a
 * "don't go" pick, and never an unpicked support-programme item.
 */
export function planPicks(interests: Record<string, string>, inputs: PickInputs, unpicked: boolean): PlannedSet[] {
  const sets = plannedSets(inputs, (artist) => {
    const status = interests[artist.artistId];
    if (status === 'will_go' || status === 'maybe') {
      return status;
    }
    return unpicked && status !== 'dont_go' && artist.isPlayable ? 'none' : null;
  });
  return sets.sort((a, b) => a.event.dateFrom - b.event.dateFrom);
}
