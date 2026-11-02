import type { DbArtistEventMap } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';

// ── Searching the lineup by name ──────────────────────────────────────────────
//
// One result per set whose artist's name matches the query, and one per
// matching artist with no set yet. Case and accents never matter. The names are
// folded once (searchIndex), when the lineup changes; a keystroke only scans
// them. The order: the name starts with the query, then a word in it does, then
// anywhere; within each, by start time, an artist with no set last.

/** A name folded for matching, each folded letter pointing back at its own in the name. */
export type FoldedName = { name: string; folded: string; origin: number[] };

const COMBINING_MARK = /\p{M}/gu;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function foldCharacter(character: string): string {
  return character.normalize('NFD').replace(COMBINING_MARK, '').toLowerCase();
}

/** Folds case and accents away: "SKÁLMÖLD" → "skalmold". */
export function foldName(name: string): FoldedName {
  let folded = '';
  const origin: number[] = [];
  let index = 0;
  for (const character of name) {
    for (const letter of foldCharacter(character)) {
      folded += letter;
      origin.push(index);
    }
    index += character.length;
  }
  return { name, folded, origin };
}

/** The query as names are folded; empty when it is blank. */
export function foldQuery(query: string): string {
  return foldName(query.trim()).folded;
}

/**
 * Where a query matches a name, in the name's own indices (end exclusive): rank
 * 0 when the name starts with it, 1 when a word does, 2 anywhere else.
 */
export type NameMatch = { rank: 0 | 1 | 2; start: number; end: number };

function rankAt(folded: string, at: number): 0 | 1 | 2 {
  if (at === 0) {
    return 0;
  }
  return WORD_CHARACTER.test(folded[at - 1]) ? 2 : 1;
}

/** The best-ranked occurrence of an already folded query in a name; null for none or an empty query. */
export function matchName(name: FoldedName, foldedQuery: string): NameMatch | null {
  if (foldedQuery === '') {
    return null;
  }
  let best: { rank: 0 | 1 | 2; at: number } | null = null;
  let at = name.folded.indexOf(foldedQuery);
  while (at !== -1) {
    const rank = rankAt(name.folded, at);
    if (best === null || rank < best.rank) {
      best = { rank, at };
    }
    if (rank === 0) {
      break;
    }
    at = name.folded.indexOf(foldedQuery, at + 1);
  }
  if (best === null) {
    return null;
  }
  const endAt = best.at + foldedQuery.length;
  // Up to the next folded letter's own start, so an accent written after its
  // letter stays with it.
  const end = endAt < name.origin.length ? name.origin[endAt] : name.name.length;
  return { rank: best.rank, start: name.origin[best.at], end };
}

export type SearchIndexEntry = { artist: DbArtist; name: FoldedName };

/** The lineup's names, folded once. */
export function searchIndex(artists: DbArtist[]): SearchIndexEntry[] {
  return artists.map((artist) => ({ artist, name: foldName(artist.name) }));
}

/** One result: a set, or an artist with no set (event null), and where the name matched. */
export type SearchHit = { artist: DbArtist; event: DbEvent | null; match: NameMatch };

const EMPTY_EVENTS: DbEvent[] = [];

function compareHits(a: SearchHit, b: SearchHit): number {
  if (a.match.rank !== b.match.rank) {
    return a.match.rank - b.match.rank;
  }
  if (a.event === null || b.event === null) {
    if (a.event !== b.event) {
      return a.event === null ? 1 : -1;
    }
  } else if (a.event.dateFrom !== b.event.dateFrom) {
    return a.event.dateFrom - b.event.dateFrom;
  }
  if (a.artist.name !== b.artist.name) {
    return a.artist.name < b.artist.name ? -1 : 1;
  }
  const aId = a.event?.eventId ?? '';
  const bId = b.event?.eventId ?? '';
  if (aId === bId) {
    return 0;
  }
  return aId < bId ? -1 : 1;
}

/** Every set, and every artist with no set, whose name matches `query`, best first. */
export function searchLineup(query: string, index: SearchIndexEntry[], artistEvents: DbArtistEventMap): SearchHit[] {
  const folded = foldQuery(query);
  if (folded === '') {
    return [];
  }
  const hits: SearchHit[] = [];
  for (const entry of index) {
    const match = matchName(entry.name, folded);
    if (match === null) {
      continue;
    }
    const events = artistEvents[entry.artist.artistId] ?? EMPTY_EVENTS;
    if (events.length === 0) {
      hits.push({ artist: entry.artist, event: null, match });
    }
    for (const event of events) {
      hits.push({ artist: entry.artist, event, match });
    }
  }
  return hits.sort(compareHits);
}
