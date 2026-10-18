import type { DbArtistEventMap } from '../cache/cacheService';
import { getStageLocalized } from './localization';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Everything these computations need from the festival cache, passed in rather
 * than read here. Keeping them pure is what lets callers memoise on the real
 * data: a function that reaches into the cache itself has a dependency React
 * cannot see, which is how the timeline's conflict bars went stale.
 */
export type ConflictInputs = {
  artists: DbArtist[];
  stages: DbStage[];
  artistEvents: DbArtistEventMap;
};

export type ConflictEntry = {
  leader: boolean;
  event: DbEvent;
  artist: DbArtist;
  stageName: string;
  overlapCount: number;
  overlappingEvents: DbEvent[];
};

// ── Core computation ──────────────────────────────────────────────────────────

const EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS = 2 * 60 * 60 * 1000;

/**
 * Computes all will_go conflict entries for an interest map and cache inputs.
 * Single source of truth — used by both ConflictContext and ConflictDetailSheet.
 */
export function computeConflictEntries(
  interests: Record<string, string>,
  { artists, stages, artistEvents }: ConflictInputs,
): ConflictEntry[] {
  const stageById  = Object.fromEntries(stages.map((s) => [s.stageId, s]));
  const artistById = Object.fromEntries(artists.map((a) => [a.artistId, a]));

  // Collect all will_go events that can clash at all. Eligibility is checked
  // here, once per set, rather than by eventsOverlap twice per pair below: under
  // an interpreter (Hermes; Reassure's --max-opt=1) every call in the pairing
  // loop is paid in full.
  // TODO: may want a filter that will include "maybe" into the conflict list
  const markedEvents: DbEvent[] = [];
  for (const artist of artists) {
    if ((interests[artist.artistId] ?? 'none') === 'will_go') {
      markedEvents.push(...(artistEvents[artist.artistId] ?? []).filter(isConflictEligible));
    }
  }

  // Build conflict map: eventId → overlapping events. The sets are all eligible,
  // so this is eventsOverlap's time test alone, inlined.
  const conflictMap = new Map<string, DbEvent[]>();
  for (let i = 0; i < markedEvents.length; i++) {
    for (let j = i + 1; j < markedEvents.length; j++) {
      const a = markedEvents[i];
      const b = markedEvents[j];
      if (a.dateFrom < b.dateTo && b.dateFrom < a.dateTo) {
        if (!conflictMap.has(a.eventId)) { conflictMap.set(a.eventId, []); }
        if (!conflictMap.has(b.eventId)) { conflictMap.set(b.eventId, []); }
        conflictMap.get(a.eventId)!.push(b);
        conflictMap.get(b.eventId)!.push(a);
      }
    }
  }

  // Build entries sorted by start time, with leader flag for group headers
  let latest = 0;
  return markedEvents
    .filter((e) => conflictMap.has(e.eventId))
    .sort((a, b) => a.dateFrom - b.dateFrom)
    .map((event) => {
      const overlapping = conflictMap.get(event.eventId) ?? [];
      const artist  = artistById[event.artistId];
      const stage   = stageById[event.stageId];
      const stageName = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
      const leader  = event.dateFrom > latest;
      latest = leader ? event.dateTo : Math.max(latest, event.dateTo);
      return { leader, event, artist, stageName, overlapCount: overlapping.length, overlappingEvents: overlapping };
    });
}

/**
 * The clash group a set belongs to, in start order: from the group's leader up
 * to the next one. A group chains sets through their overlaps, so it holds sets
 * that miss its first one too. The same groups My plan titles. Empty for a set
 * that clashes with nothing.
 */
export function conflictGroupOf(entries: ConflictEntry[], eventId: string): DbEvent[] {
  let group: DbEvent[] = [];
  let found = false;
  for (const entry of entries) {
    if (entry.leader) {
      if (found) {
        break;
      }
      group = [];
    }
    group.push(entry.event);
    found = found || entry.event.eventId === eventId;
  }
  return found ? group : [];
}

// ── Overlap spans (for the timeline conflict marker) ────────────────────────────

// A single [from, to] time interval (Unix ms) of an event that is covered by a conflict.
export type ConflictOverlap = { from: number; to: number };

/**
 * For every conflicting will_go event, the merged set of disjoint intervals where
 * it actually overlaps other will_go events. An event that clashes with two others
 * on either side (with a clear gap in the middle) yields two intervals, so the
 * timeline draws two bars and leaves the gap uncovered.
 *
 * Cost is dominated by computeConflictEntries' O(n²) pairing; the per-event merge is
 * O(k log k) over the (small) number of conflicts that event has.
 */
export function computeConflictOverlaps(
  interests: Record<string, string>,
  inputs: ConflictInputs,
): Map<string, ConflictOverlap[]> {
  const map = new Map<string, ConflictOverlap[]>();
  for (const entry of computeConflictEntries(interests, inputs)) {
    // Pairwise intersections of this event with each event it conflicts with.
    const intervals: ConflictOverlap[] = [];
    for (const other of entry.overlappingEvents) {
      const from = Math.max(entry.event.dateFrom, other.dateFrom);
      const to   = Math.min(entry.event.dateTo,   other.dateTo);
      if (from < to) { intervals.push({ from, to }); }
    }
    if (intervals.length === 0) { continue; }

    // Merge into disjoint intervals.
    intervals.sort((a, b) => a.from - b.from);
    const merged: ConflictOverlap[] = [{ ...intervals[0] }];
    for (let i = 1; i < intervals.length; i++) {
      const last = merged[merged.length - 1];
      const cur  = intervals[i];
      if (cur.from <= last.to) {
        last.to = Math.max(last.to, cur.to);
      } else {
        merged.push({ ...cur });
      }
    }
    map.set(entry.event.eventId, merged);
  }
  return map;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Whether a set takes part in conflicts at all: no longer than two hours. Longer
 * ones are things like all-day exhibitions, which clash with everything.
 *
 * The one eligibility rule shared by the conflict calculation and My plan's list
 * (planUtils, nowPillState): the plan lists exactly the sets considered here, so
 * the two never disagree. Change it here, for both.
 */
export function isConflictEligible(event: DbEvent): boolean {
  return event.dateTo - event.dateFrom <= EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS;
}

/** Returns true if two events' time ranges intersect (strict overlap). */
export function eventsOverlap(a: DbEvent, b: DbEvent): boolean {
  if (!isConflictEligible(a) || !isConflictEligible(b)) { return false; }
  return a.dateFrom < b.dateTo && b.dateFrom < a.dateTo;
}
