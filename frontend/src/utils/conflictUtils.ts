import { getArtists, getArtistEvents, getStages } from '../cache/cacheService';
import { getStageLocalized } from './localization';
import type { DbArtist, DbEvent } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

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
 * Computes all must_see conflict entries for a given slug and interest map.
 * Single source of truth — used by both ConflictContext and ConflictDetailSheet.
 */
export function computeConflictEntries(
  slug: string,
  interests: Record<string, string>,
): ConflictEntry[] {
  const artists = getArtists(slug);
  const stages  = getStages(slug);
  const stageById  = Object.fromEntries(stages.map((s) => [s.stageId, s]));
  const artistById = Object.fromEntries(artists.map((a) => [a.artistId, a]));

  // Collect all must_see events
  // TODO: may want a filter that will include "maybe" into the conflict list
  const markedEvents: DbEvent[] = [];
  for (const artist of artists) {
    if ((interests[artist.artistId] ?? 'none') === 'must_see') {
      markedEvents.push(...getArtistEvents(slug, artist.artistId));
    }
  }

  // Build conflict map: eventId → overlapping events
  const conflictMap = new Map<string, DbEvent[]>();
  for (let i = 0; i < markedEvents.length; i++) {
    for (let j = i + 1; j < markedEvents.length; j++) {
      const a = markedEvents[i];
      const b = markedEvents[j];
      if (eventsOverlap(a, b)) {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if two events' time ranges intersect (strict overlap). */
export function eventsOverlap(a: DbEvent, b: DbEvent): boolean {
  if (a.dateTo - a.dateFrom > EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS) { return false; }
  if (b.dateTo - b.dateFrom > EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS) { return false; }
  return a.dateFrom < b.dateTo && b.dateFrom < a.dateTo;
}
