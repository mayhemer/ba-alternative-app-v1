import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── In-memory store ───────────────────────────────────────────────────────────

// Keyed by slug: cache[slug][entity]
const memoryCache: Record<string, CacheData> = {};

// ── Public read API (used by UI only) ─────────────────────────────────────────

export function getArtists(slug: string): DbArtist[] {
  return memoryCache[slug]?.artists ?? [];
}

export function getCategories(slug: string): DbCategory[] {
  return memoryCache[slug]?.categories ?? [];
}

export function getStages(slug: string): DbStage[] {
  return memoryCache[slug]?.stages ?? [];
}

export function getEvents(slug: string): DbEvent[] {
  return memoryCache[slug]?.events ?? [];
}

export function hasCachedData(slug: string): boolean {
  return memoryCache[slug] !== undefined;
}

// ── Write API (used by background sync service only) ─────────────────────────

export function populateCache(slug: string, data: CacheData): void {
  // Atomic replacement — JS is single-threaded, so no partial reads are possible.
  memoryCache[slug] = { ...data };
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
