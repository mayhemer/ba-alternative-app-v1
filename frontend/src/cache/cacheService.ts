import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbArtist, DbCategory, DbEvent, DbStage, DbUserInterest } from '../types/backend';
import { deriveFestivalDays, DAY_DURATION_MS } from '../components/timeline/timelineLayout';

// ── Public festival data types ────────────────────────────────────────────────

export type DbArtistEventMap = Record<string, DbEvent[]>;
export type DbFestivalDays = number[];

// Per-day layout for one category: how many sub-rows are needed and which
// sub-row each event occupies. Computed once at build time; used by the
// non-playable timeline to render overlapping events without visual collision.
export type DbCategoryDayLayout = {
  subRowCount: number;
  eventSubRows: Record<string, number>; // eventId → 0-based sub-row index
};
// Key: `${categoryId}_${dayStart}`
export type DbLayoutMap = Record<string, DbCategoryDayLayout>;

// The four datasets exactly as the API serves them. Everything else in
// CacheData is derived from these, so this is all that gets persisted.
export type FestivalRawData = {
  artists: DbArtist[];
  categories: DbCategory[];
  stages: DbStage[];
  events: DbEvent[];
};

export type CacheData = FestivalRawData & {
  artistEventMap: DbArtistEventMap;
  festivalDays: DbFestivalDays;
  layoutMap: DbLayoutMap;
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

// Sync watermark per slug: the server's own `lastSyncedAt` that the cached data
// corresponds to. NOT a local clock reading — /validity compares the value we
// send against the server's last rebuild time, so sending Date.now() would make
// the server answer "unchanged" forever and updates would never arrive.
const syncWatermark: Record<string, number> = {};

// User interest data — keyed by slug → artistId
const interestCache: Record<string, Record<string, LocalInterest>> = {};

// ── AsyncStorage keys ─────────────────────────────────────────────────────────

function interestStorageKey(slug: string): string {
  return `user:interests:${slug}`;
}

function festivalStorageKey(slug: string): string {
  return `festival:data:${slug}`;
}

// Bumped when the persisted shape changes; a mismatch discards the stored copy
// rather than feeding a stale shape into the UI.
const FESTIVAL_CACHE_VERSION = 1;

type PersistedFestival = {
  version: number;
  syncedAt: number;
} & FestivalRawData;

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

export function getFestivalDays(slug: string): DbFestivalDays {
  return festivalCache[slug]?.festivalDays ?? [];
}

export function getEvents(slug: string): DbEvent[] {
  return festivalCache[slug]?.events ?? [];
}

export function getArtistEvents(slug: string, artistId: string): DbEvent[] {
  return festivalCache[slug]?.artistEventMap[artistId] ?? [];
}

export function getCategoryDayLayout(slug: string, categoryId: string, dayStart: number): DbCategoryDayLayout {
  return festivalCache[slug]?.layoutMap[`${categoryId}_${dayStart}`] ?? { subRowCount: 1, eventSubRows: {} };
}

export function hasCachedData(slug: string): boolean {
  return festivalCache[slug] !== undefined;
}

/**
 * The server-side `lastSyncedAt` the cached data for this slug corresponds to.
 * 0 when nothing is cached, which makes /validity report "changed" and forces a
 * full fetch — the correct fallback.
 */
export function getSyncWatermark(slug: string): number {
  return syncWatermark[slug] ?? 0;
}

// ── Festival data — write API (background sync service only) ──────────────────

/**
 * Atomically replaces the in-memory data for a slug and persists the raw
 * datasets so the next cold start can render before (or without) the network.
 * `syncedAt` must be the server's own last-rebuild time — see `syncWatermark`.
 *
 * Persistence is fire-and-forget: a failed write only costs the offline start,
 * never the running session.
 */
export function populateCache(slug: string, data: CacheData, syncedAt: number): void {
  // Atomic replacement — JS is single-threaded, so no partial reads are possible.
  festivalCache[slug] = { ...data };
  syncWatermark[slug] = syncedAt;

  const persisted: PersistedFestival = {
    version: FESTIVAL_CACHE_VERSION,
    syncedAt,
    artists: data.artists,
    categories: data.categories,
    stages: data.stages,
    events: data.events,
  };
  AsyncStorage.setItem(festivalStorageKey(slug), JSON.stringify(persisted)).catch((err: unknown) => {
    // Typically a web localStorage quota overflow. The session is unaffected.
    if (__DEV__) { console.warn('[cache] festival data not persisted', err); }
  });
}

/**
 * Loads the persisted datasets for a slug into memory, rebuilding the derived
 * structures. Returns true when usable data is now in the cache.
 *
 * In-memory data always wins: a live session is at least as fresh as the disk
 * copy it was written from, so an already-populated slug short-circuits.
 * Never rejects — a missing, corrupt or outdated entry simply means "no data".
 */
export async function hydrateFestivalCache(slug: string): Promise<boolean> {
  if (hasCachedData(slug)) {
    return true;
  }

  try {
    const stored = await AsyncStorage.getItem(festivalStorageKey(slug));
    if (stored === null) {
      return false;
    }

    const parsed = JSON.parse(stored) as PersistedFestival;
    if (parsed.version !== FESTIVAL_CACHE_VERSION || !Array.isArray(parsed.events)) {
      return false;
    }

    festivalCache[slug] = buildCacheData(parsed);
    syncWatermark[slug] = parsed.syncedAt ?? 0;
    return true;
  } catch (err: unknown) {
    if (__DEV__) { console.warn('[cache] festival data not restored', err); }
    return false;
  }
}

// ── Layout map builder ────────────────────────────────────────────────────────

// Assigns each event to the minimum sub-row where it does not overlap with
// any already-placed event. Uses a greedy interval-scheduling algorithm:
// sort by start time, then place each event in the first sub-row whose last
// event has already ended.
function buildLayoutMap(events: DbEvent[], festivalDays: DbFestivalDays): DbLayoutMap {
  const layoutMap: DbLayoutMap = {};

  for (const day of festivalDays) {
    const dayEnd = day + DAY_DURATION_MS;
    const byCategory: Record<string, DbEvent[]> = {};

    for (const event of events) {
      if (event.dateFrom < day || event.dateFrom >= dayEnd) { continue; }
      if (byCategory[event.categoryId] === undefined) { byCategory[event.categoryId] = []; }
      byCategory[event.categoryId].push(event);
    }

    for (const [categoryId, catEvents] of Object.entries(byCategory)) {
      const sorted = [...catEvents].sort((a, b) => a.dateFrom - b.dateFrom);
      const subRowEndTimes: number[] = [];
      const eventSubRows: Record<string, number> = {};

      for (const event of sorted) {
        let assigned = false;
        for (let row = 0; row < subRowEndTimes.length; row++) {
          if (subRowEndTimes[row] <= event.dateFrom) {
            eventSubRows[event.eventId] = row;
            subRowEndTimes[row] = event.dateTo;
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          eventSubRows[event.eventId] = subRowEndTimes.length;
          subRowEndTimes.push(event.dateTo);
        }
      }

      layoutMap[`${categoryId}_${day}`] = {
        subRowCount: Math.max(1, subRowEndTimes.length),
        eventSubRows,
      };
    }
  }

  return layoutMap;
}

// ── Derived structure builder ─────────────────────────────────────────────────

// The single place where the derived views are computed, shared by a fresh
// fetch (collector.build) and by a restore from AsyncStorage — so restored data
// can never differ in shape from fetched data.
function buildCacheData(raw: FestivalRawData): CacheData {
  const { artists, categories, stages, events } = raw;
  const festivalDays = deriveFestivalDays(events);

  const artistEventMap: DbArtistEventMap = {};
  for (const event of events) {
    if (artistEventMap[event.artistId] === undefined) {
      artistEventMap[event.artistId] = [];
    }
    artistEventMap[event.artistId].push(event);
  }

  const layoutMap = buildLayoutMap(events, festivalDays);
  return { artists, categories, stages, events, artistEventMap, festivalDays, layoutMap };
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
      return buildCacheData({ artists, categories, stages, events });
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
    } else if (item.status === 'maybe') {
      localStatus = 'maybe';
    } else {
      localStatus = 'none';
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
