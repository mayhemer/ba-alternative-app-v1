import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbArtist, DbCategory, DbEvent, DbStage, DbUserInterest } from '../types/backend';

// ── Public festival data types ────────────────────────────────────────────────

export type CacheData = {
  artists: DbArtist[];
  categories: DbCategory[];
  stages: DbStage[];
  events: DbEvent[];
};

export type DataCollector = {
  setArtists(data: DbArtist[]): void;
  setCategories(data: DbCategory[]): void;
  setStages(data: DbStage[]): void;
  setEvents(data: DbEvent[]): void;
};

// ── Interest types ────────────────────────────────────────────────────────────

// Frontend-local status values. Mapping to server on sync:
//   'must_see' → 'will_go'  |  'maybe' → 'maybe'  |  'none' → DELETE
export type InterestStatus = 'none' | 'maybe' | 'must_see';

export type LocalInterest = {
  status: InterestStatus;
  updatedAt: number; // Unix ms — used for conflict resolution on server merge
};

// ── In-memory stores ──────────────────────────────────────────────────────────

// Public festival data — keyed by slug
const festivalCache: Record<string, CacheData> = {};

// User interest data — keyed by slug → artistId
const interestCache: Record<string, Record<string, LocalInterest>> = {};

// ── AsyncStorage keys ─────────────────────────────────────────────────────────

function interestStorageKey(slug: string): string {
  return `user:interests:${slug}`;
}

// ── Festival data — public read API (UI only) ─────────────────────────────────

export function getArtists(slug: string): DbArtist[] {
  return festivalCache[slug]?.artists ?? [];
}

export function getCategories(slug: string): DbCategory[] {
  return festivalCache[slug]?.categories ?? [];
}

export function getStages(slug: string): DbStage[] {
  return festivalCache[slug]?.stages ?? [];
}

export function getEvents(slug: string): DbEvent[] {
  return festivalCache[slug]?.events ?? [];
}

export function hasCachedData(slug: string): boolean {
  return festivalCache[slug] !== undefined;
}

// ── Festival data — write API (background sync service only) ──────────────────

export function populateCache(slug: string, data: CacheData): void {
  // Atomic replacement — JS is single-threaded, so no partial reads are possible.
  festivalCache[slug] = { ...data };
}

// ── DataCollector factory ─────────────────────────────────────────────────────
// Used by adapters to collect fetched data before an atomic cache update.

export function createDataCollector(): DataCollector & { build(): CacheData } {
  let artists: DbArtist[] = [];
  let categories: DbCategory[] = [];
  let stages: DbStage[] = [];
  let events: DbEvent[] = [];

  return {
    setArtists(data: DbArtist[]): void {
      artists = data;
    },
    setCategories(data: DbCategory[]): void {
      categories = data;
    },
    setStages(data: DbStage[]): void {
      stages = data;
    },
    setEvents(data: DbEvent[]): void {
      events = data;
    },
    build(): CacheData {
      return { artists, categories, stages, events };
    },
  };
}

// ── Interest data — read API ──────────────────────────────────────────────────

/**
 * Returns the in-memory interest map for a slug.
 * Only valid after hydrateInterests() has been called for this slug.
 */
export function getInterests(slug: string): Record<string, LocalInterest> {
  return interestCache[slug] ?? {};
}

// ── Interest data — write API ─────────────────────────────────────────────────

/**
 * Load interests for a slug from AsyncStorage into the in-memory cache.
 * Returns the hydrated map. Call once per slug change before reading interests.
 */
export async function hydrateInterests(slug: string): Promise<Record<string, LocalInterest>> {
  const stored = await AsyncStorage.getItem(interestStorageKey(slug));
  const map: Record<string, LocalInterest> = stored !== null ? JSON.parse(stored) : {};
  interestCache[slug] = map;
  return map;
}

/**
 * Update a single interest in memory and persist the whole slug map to AsyncStorage.
 * Returns a promise that resolves with the stored record once AsyncStorage write completes.
 * The in-memory update is synchronous; the promise covers the persistence step only.
 */
export async function setInterest(
  slug: string,
  artistId: string,
  status: InterestStatus,
): Promise<LocalInterest> {
  if (interestCache[slug] === undefined) {
    interestCache[slug] = {};
  }
  const record: LocalInterest = { status, updatedAt: Date.now() };
  interestCache[slug] = { ...interestCache[slug], [artistId]: record };
  await AsyncStorage.setItem(interestStorageKey(slug), JSON.stringify(interestCache[slug]));
  return record;
}

/**
 * Merge server interests into the local cache using latest-updatedAt-wins strategy.
 * Called after login when the server state is retrieved.
 *
 * Server status mapping:
 *   'will_go' → 'must_see'
 *   'maybe'   → 'maybe'
 */
export async function mergeServerInterests(
  slug: string,
  serverInterests: DbUserInterest[],
): Promise<Record<string, LocalInterest>> {
  const local = interestCache[slug] ?? {};
  const merged: Record<string, LocalInterest> = { ...local };

  for (const item of serverInterests) {
    // Composite SK is "{slug}#{artistId}"
    const separatorIndex = item.slugArtistId.indexOf('#');
    if (separatorIndex === -1) { continue; }
    const artistId = item.slugArtistId.slice(separatorIndex + 1);

    let localStatus: InterestStatus;
    if (item.status === 'will_go') {
      localStatus = 'must_see';
    } else {
      localStatus = 'maybe';
    }

    const existing = merged[artistId];
    if (existing === undefined || item.updatedAt > existing.updatedAt) {
      merged[artistId] = { status: localStatus, updatedAt: item.updatedAt };
    }
  }

  interestCache[slug] = merged;
  await AsyncStorage.setItem(interestStorageKey(slug), JSON.stringify(merged));
  return merged;
}
