import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DbArtist, DbArtistBioLocalized, DbArtistBios, DbArtistLocalized, DbCategory,
  DbEvent, DbStage, DbUserInterest,
} from '../types/backend';
import { deriveFestivalDays, DAY_DURATION_MS } from '../components/timeline/timelineLayout';
import { currentTimeMs } from '../utils/clock';

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
// corresponds to. NOT a local clock reading — it is compared against the server's
// last rebuild time reported by /validity, so storing Date.now() here would look
// newer than every rebuild and updates would never arrive.
const syncWatermark: Record<string, number> = {};

// Artist bios, fetched for the whole edition in one request because the artists
// endpoint no longer carries them. Persisted apart from the main datasets so
// the list can paint before they arrive.
//
// Stamped with the server's `artistsSyncedAt` rather than the overall sync
// watermark: the bios only go stale when the artists themselves are rebuilt, so
// a schedule-only change — the common one mid-festival — must not discard them.
type BioStore = {
  artistsSyncedAt: number;
  bios: Record<string, DbArtistBioLocalized[]>;
};

const bioCache: Record<string, BioStore> = {};

// Whether a bulk bio fetch is in flight for a slug. Lets the detail screen tell
// "still on its way" from "we tried and there is no network".
const biosLoading: Record<string, boolean> = {};

// User interest data — keyed by slug → artistId
const interestCache: Record<string, Record<string, LocalInterest>> = {};

// ── Change notification ───────────────────────────────────────────────────────

// The cache lives outside React, so React has to be told when it changes. This
// is the whole bridge: a monotonic version plus a listener set, consumed through
// `useSyncExternalStore` (see store/cacheStore.ts).
//
// It replaces the old AppContext event emitter, where subscribing was optional
// and most readers simply didn't — they re-rendered because a subscribed parent
// happened to, which is what made the June 2026 "empty conflicts view" bug
// possible. Here a component cannot read cached data without subscribing to it,
// so the invariant is structural rather than remembered.
let cacheVersion = 0;
const cacheListeners = new Set<() => void>();

/** Subscribe to cache mutations. Returns the unsubscribe function. */
export function subscribeToCache(listener: () => void): () => void {
  cacheListeners.add(listener);
  return () => { cacheListeners.delete(listener); };
}

/** Monotonic counter, bumped once per mutation. Stable between mutations. */
export function getCacheVersion(): number {
  return cacheVersion;
}

// Every write path below ends here. Listeners are copied before iteration so a
// listener that unsubscribes during the notification cannot corrupt the walk.
function notifyCacheChanged(): void {
  cacheVersion += 1;
  for (const listener of [...cacheListeners]) {
    listener();
  }
}

// ── AsyncStorage keys ─────────────────────────────────────────────────────────

function interestStorageKey(slug: string): string {
  return `user:interests:${slug}`;
}

function festivalStorageKey(slug: string): string {
  return `festival:data:${slug}`;
}

const BIO_KEY_PREFIX = 'festival:bios:';

function bioStorageKey(slug: string): string {
  return `${BIO_KEY_PREFIX}${slug}`;
}

// Bumped when the persisted shape changes. A version this build knows how to
// upgrade is migrated in place; anything else discards the stored copy rather
// than feeding a stale shape into the UI.
const FESTIVAL_CACHE_VERSION = 2;

type PersistedFestival = {
  version: number;
  syncedAt: number;
} & FestivalRawData;

// ── Festival data — public read API (UI only) ─────────────────────────────────

// Shared "nothing cached" values. These are returned by reference rather than
// freshly allocated per call because the getters are read through
// useSyncExternalStore: React compares snapshots by identity, and a `?? []`
// that builds a new array on every read is an infinite render loop.
// Frozen so a caller cannot mutate the shared instance.
const EMPTY_ARTISTS  = Object.freeze([]) as unknown as DbArtist[];
const EMPTY_CATEGORIES = Object.freeze([]) as unknown as DbCategory[];
const EMPTY_STAGES   = Object.freeze([]) as unknown as DbStage[];
const EMPTY_EVENTS   = Object.freeze([]) as unknown as DbEvent[];
const EMPTY_DAYS     = Object.freeze([]) as unknown as DbFestivalDays;
const EMPTY_LAYOUT: DbCategoryDayLayout = Object.freeze({
  subRowCount: 1,
  eventSubRows: Object.freeze({}) as Record<string, number>,
});
const EMPTY_ARTIST_EVENTS = Object.freeze({}) as DbArtistEventMap;
const EMPTY_LAYOUT_MAP    = Object.freeze({}) as DbLayoutMap;

export function getArtists(slug: string): DbArtist[] {
  return festivalCache[slug]?.artists ?? EMPTY_ARTISTS;
}

export function getCategories(slug: string): DbCategory[] {
  return festivalCache[slug]?.categories ?? EMPTY_CATEGORIES;
}

export function getStages(slug: string): DbStage[] {
  return festivalCache[slug]?.stages ?? EMPTY_STAGES;
}

export function getFestivalDays(slug: string): DbFestivalDays {
  return festivalCache[slug]?.festivalDays ?? EMPTY_DAYS;
}

export function getEvents(slug: string): DbEvent[] {
  return festivalCache[slug]?.events ?? EMPTY_EVENTS;
}

export function getArtistEvents(slug: string, artistId: string): DbEvent[] {
  return festivalCache[slug]?.artistEventMap[artistId] ?? EMPTY_EVENTS;
}

/**
 * The whole artistId → events map, by reference. Callers that need lookups for
 * many artists take this rather than calling `getArtistEvents` in a loop: it is
 * one stable value they can depend on, so a derived computation over it has an
 * honest dependency instead of a hidden read.
 */
export function getArtistEventMap(slug: string): DbArtistEventMap {
  return festivalCache[slug]?.artistEventMap ?? EMPTY_ARTIST_EVENTS;
}

/** The whole per-category/day layout map, by reference. Same rationale. */
export function getLayoutMap(slug: string): DbLayoutMap {
  return festivalCache[slug]?.layoutMap ?? EMPTY_LAYOUT_MAP;
}

export function getCategoryDayLayout(slug: string, categoryId: string, dayStart: number): DbCategoryDayLayout {
  return festivalCache[slug]?.layoutMap[`${categoryId}_${dayStart}`] ?? EMPTY_LAYOUT;
}

export function hasCachedData(slug: string): boolean {
  return festivalCache[slug] !== undefined;
}

/** Cached bios for one artist, or undefined when this edition's bios are not loaded. */
export function getArtistBio(slug: string, artistId: string): DbArtistBioLocalized[] | undefined {
  return bioCache[slug]?.bios[artistId];
}

/** True once this edition's bios are in the cache, whether or not any artist has one. */
export function hasBios(slug: string): boolean {
  return bioCache[slug] !== undefined && bioCache[slug].artistsSyncedAt > 0;
}

/** True while a bulk bio fetch for this edition is running. */
export function areBiosLoading(slug: string): boolean {
  return biosLoading[slug] === true;
}

/** Set by the sync service around its bulk bio fetch. */
export function setBiosLoading(slug: string, loading: boolean): void {
  if (biosLoading[slug] === loading) {
    return;
  }
  biosLoading[slug] = loading;
  // A detail screen on a spinner has to learn that the bios arrived — or that
  // they are not coming — so the loading flag is part of the observed state.
  notifyCacheChanged();
}

/** Replaces this edition's bios with a freshly fetched set and persists them. */
export function putArtistBios(
  slug: string,
  entries: DbArtistBios[],
  artistsSyncedAt: number,
): void {
  const bios: Record<string, DbArtistBioLocalized[]> = {};
  for (const entry of entries) {
    bios[entry.artistId] = entry.localized;
  }

  const store: BioStore = { artistsSyncedAt, bios };
  bioCache[slug] = store;

  AsyncStorage.setItem(bioStorageKey(slug), JSON.stringify(store)).catch((err: unknown) => {
    if (__DEV__) { console.warn('[cache] artist bios not persisted', err); }
  });

  notifyCacheChanged();
}

/**
 * Discards this edition's bios when the server rebuilt its artists after the
 * cached copy was taken. A schedule-only change leaves `artistsSyncedAt`
 * untouched and the bios stand.
 */
export function invalidateBiosIfStale(slug: string, artistsSyncedAt: number): void {
  const store = bioCache[slug];
  if (store === undefined || store.artistsSyncedAt >= artistsSyncedAt) {
    return;
  }

  delete bioCache[slug];
  AsyncStorage.removeItem(bioStorageKey(slug)).catch((err: unknown) => {
    if (__DEV__) { console.warn('[cache] stale artist bios not cleared', err); }
  });

  notifyCacheChanged();
}

/**
 * The server-side `lastSyncedAt` the cached data for this slug corresponds to.
 * 0 when nothing is cached, so every /validity reading looks newer and forces a
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

  // After the in-memory swap, not after the write: readers are served from
  // memory, and the persist is fire-and-forget.
  notifyCacheChanged();
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
  // Runs before the short-circuit below: bios are persisted separately, so a
  // slug whose datasets are already in memory can still be missing them.
  await hydrateBioCache(slug);

  if (hasCachedData(slug)) {
    return true;
  }

  try {
    const stored = await AsyncStorage.getItem(festivalStorageKey(slug));
    if (stored === null) {
      return false;
    }

    let parsed = JSON.parse(stored) as PersistedFestival;
    if (!Array.isArray(parsed.events)) {
      return false;
    }
    if (parsed.version === 1) {
      parsed = upgradeFromV1(slug, parsed);
    }
    if (parsed.version !== FESTIVAL_CACHE_VERSION) {
      return false;
    }

    festivalCache[slug] = buildCacheData(parsed);
    syncWatermark[slug] = parsed.syncedAt ?? 0;
    notifyCacheChanged();
    return true;
  } catch (err: unknown) {
    if (__DEV__) { console.warn('[cache] festival data not restored', err); }
    return false;
  }
}

// Loads the persisted bio map for a slug. Never rejects — a missing or corrupt
// entry just means the bios are refetched.
async function hydrateBioCache(slug: string): Promise<void> {
  await evictBiosExcept(slug);

  if (bioCache[slug] !== undefined) {
    return;
  }

  try {
    const stored = await AsyncStorage.getItem(bioStorageKey(slug));
    if (stored !== null) {
      bioCache[slug] = JSON.parse(stored) as BioStore;
      notifyCacheChanged();
    }
  } catch (err: unknown) {
    if (__DEV__) { console.warn('[cache] artist bios not restored', err); }
  }
}

// v1 carried each artist's bio inline; v2 keeps bios in their own store. The
// blob is upgraded rather than discarded on purpose — discarding is what
// `hydrateFestivalCache` does for an unknown version, and for this one it would
// throw away the cached schedule of anyone who takes the new build and then
// opens the app offline, which is the case the persisted cache exists for.
type PersistedArtistV1 = Omit<DbArtist, 'localized'> & {
  localized: (DbArtistLocalized & { content?: string })[];
};

function upgradeFromV1(slug: string, parsed: PersistedFestival): PersistedFestival {
  const legacy = parsed.artists as unknown as PersistedArtistV1[];

  // Lift the inline bios across, so an upgrading user keeps every one of them
  // offline instead of refetching. Skipped if a bio store already exists — that
  // one came from the server and is at least as good.
  if (!hasBios(slug)) {
    const entries: DbArtistBios[] = legacy.map((artist) => ({
      artistId: artist.artistId,
      localized: artist.localized
        .filter((l) => l.content !== undefined)
        .map((l) => ({ language: l.language, content: l.content ?? '' })),
    }));
    // Stamped with the blob's own watermark: the bios were written together
    // with these artists, so they are exactly as current as the artists are.
    putArtistBios(slug, entries, parsed.syncedAt);
  }

  const upgraded: PersistedFestival = {
    ...parsed,
    version: FESTIVAL_CACHE_VERSION,
    artists: legacy.map(({ localized, ...artist }) => ({
      ...artist,
      localized: localized.map(({ content: _content, ...rest }) => rest),
    })),
  };

  AsyncStorage.setItem(festivalStorageKey(slug), JSON.stringify(upgraded)).catch((err: unknown) => {
    if (__DEV__) { console.warn('[cache] upgraded festival data not persisted', err); }
  });

  return upgraded;
}

/**
 * Keeps at most one edition's bios. They are by far the largest thing the app
 * persists (~440 KiB per edition against a ~5 MiB browser quota), and holding
 * every visited edition's set would eventually crowd out the datasets that make
 * an offline start work — or the user's own picks.
 *
 * Hooked here rather than on an edition-switch event because
 * `hydrateFestivalCache` already runs exactly once per slug, on startup and on
 * every switch, so no other code path can bypass it. Switching back re-fetches
 * one request's worth.
 */
async function evictBiosExcept(slug: string): Promise<void> {
  const stale = Object.keys(bioCache).filter((cached) => cached !== slug);
  for (const cached of stale) {
    delete bioCache[cached];
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const orphaned = keys.filter(
      (key) => key.startsWith(BIO_KEY_PREFIX) && key !== bioStorageKey(slug),
    );
    if (orphaned.length > 0) {
      await AsyncStorage.multiRemove(orphaned);
    }
  } catch (err: unknown) {
    if (__DEV__) { console.warn('[cache] other editions\' bios not evicted', err); }
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
  const record: LocalInterest = { status, updatedAt: currentTimeMs() };
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
