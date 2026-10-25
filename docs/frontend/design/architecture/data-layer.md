# Frontend data layer

## Slug Adapter

`src/adapters/slugAdapter.ts` — returns the list of available festival editions.

```typescript
async function getSlugs(): Promise<string[]> {
  // mockup; replace with config or endpoint later
  // 2020 and 2021 are absent — both editions were cancelled (COVID-19).
  return ['ba2019', 'ba2022', 'ba2023',
          'ba2024', 'ba2025', 'ba2026', 'ba2027'];
}
```

Still a hard-coded mockup. `src/sync/festivalConfig.ts` carries the matching per-edition date
spans and must be extended in step with it.

---

## Cache Layer

`src/cache/cacheService.ts` — the **only** data source the UI reads from.

Reads are synchronous against the in-memory snapshot; nothing in the render path awaits:

```typescript
function getArtists(slug: string): DbArtist[];
function getCategories(slug: string): DbCategory[];
function getStages(slug: string): DbStage[];
function getEvents(slug: string): DbEvent[];
function getFestivalDays(slug: string): DbFestivalDays;
function getArtistEvents(slug: string, artistId: string): DbEvent[];
function getCategoryDayLayout(slug, categoryId, dayStart): DbCategoryDayLayout;
function getArtistBio(slug: string, artistId: string): DbArtistBioLocalized[] | undefined;

function getArtistEventMap(slug: string): DbArtistEventMap;
function getLayoutMap(slug: string): DbLayoutMap;

function populateCache(slug: string, data: CacheData, syncedAt: number): void;
function getSyncWatermark(slug: string): number;
async function hydrateFestivalCache(slug: string): Promise<boolean>;

function subscribeToCache(listener: () => void): () => void;
function getCacheVersion(): number;
```

- **Every getter returns a referentially stable value** between mutations. The "nothing
  cached" cases return shared frozen constants rather than a fresh `[]`, because these
  getters are read through `useSyncExternalStore`, which compares snapshots by identity —
  a snapshot that allocates on each read re-renders forever.
- Callers needing lookups across many artists or lanes take `getArtistEventMap` /
  `getLayoutMap` rather than calling the per-key getter in a loop: one stable value they
  can depend on, instead of a hidden read.

- In-memory cache for the session, backed by **AsyncStorage persistence** (shipped 2026-08-01):
  `festival:data:{slug}`, roughly 800 kB per edition. Only the raw datasets are stored; derived
  maps (artist→events, per-category day layout) are rebuilt on load by the shared
  `buildCacheData`. Artist bios persist separately and are evicted per edition.
- `populateCache` is called exclusively by the background sync service, and takes the **server's**
  `lastSyncedAt` as `syncedAt` — data and the watermark describing it are written together.
- No locking needed — JS is single-threaded; in-flight reads see previous data until
  `populateCache` completes.
- The service also owns local interests (`getInterests` / `setInterest` /
  `mergeServerInterests`), so anonymous use is local-first and login merges rather than replaces.

---

## Adapter Interface

`src/adapters/` — API-specific fetchers. Adapters do not read the cache; they only write to a
collector.

```typescript
type ValidationResult = {
  upToDate: boolean;       // true = cached data is current
  serverSyncedAt: number;  // server's own last-rebuild time → next watermark
  artistsSyncedAt: number; // moves independently; gates bio invalidation
};

interface DataAdapter {
  validate(slug: string, since: number): Promise<ValidationResult>;
  populate(slug: string, collector: DataCollector): Promise<void>;
  fetchAllBios(slug: string): Promise<DbArtistBios[]>;
}
```

`validate` returns a record rather than the originally planned bare boolean: the caller needs the
server's clock reading. `GET /{slug}/validity` takes **no** caller watermark — it answers
`{lastSyncedAt, artistsSyncedAt}` and the *client* compares, so the response is identical for every
poller and CloudFront serves the whole fleet one cached object.

**The watermark must be the server's `lastSyncedAt`, never `Date.now()`**: the comparison is
`result.lastSyncedAt <= since`, so a local clock reading is measured against the wrong scale and
suppresses every future update.

Bios are fetched separately from `populate` because they are an order of magnitude larger than the
datasets; making first paint wait for them is what splitting them out was meant to avoid.

**Current implementations**:

| Adapter | Purpose |
|---|---|
| `baPublicApiAdapter` | Public festival data; origin `https://api.ba.janbambas.cz` |
| `baUserApiAdapter` | Authenticated interests sync |
| `baShareApiAdapter` | Share tokens and friends' schedules |

- `validate` calls `GET /{slug}/validity` (no time segment — see above).
- `populate` calls `GET /{slug}/artists`, `/categories`, `/stages`, `/schedule` in parallel.
- `fetchAllBios` calls `GET /{slug}/bios`.

**Future**: create a new adapter implementing the same interface for a different API; swap at the
factory call site.

---

## Cache change notification

`cacheService` owns a monotonic `cacheVersion` and a listener set; every write path
(`populateCache`, `hydrateFestivalCache`, `putArtistBios`, `setBiosLoading`,
`invalidateBiosIfStale`) ends by bumping it and notifying. `src/store/cacheStore.ts` binds
that to React with `useSyncExternalStore`:

```typescript
useArtists(slug) / useCategories(slug) / useStages(slug) / useEvents(slug)
useFestivalDays(slug) / useArtistEvents(slug, id) / useArtistEventMap(slug)
useLayoutMap(slug) / useArtistBio(slug, id) / useHasBios(slug) / useBiosLoading(slug)
useCacheSnapshot(getSnapshot)   // escape hatch, stable snapshots only
```

**These hooks are the only sanctioned way for a component to read the cache.** Subscribing is
a side effect of reading, so a component physically cannot consume cached data without being
re-rendered when it changes — the invariant is structural rather than remembered.

This replaced an opt-in emitter on `AppContext` (`useCacheRefresh`), where subscribing was a
separate step most readers skipped; they re-rendered only because a subscribed parent happened
to, and stopped being correct when that coincidence broke. It caused the June 2026 "empty
conflicts view" bug and the timeline's vanishing conflict bars.

Consequences worth keeping in mind when adding a reader:

- To derive something that **allocates** (a `Map`, a sorted array), read the inputs with these
  hooks and compute in a `useMemo` over them. The memo then depends on the real data, so no
  change counter and no `exhaustive-deps` suppression is needed.
- Pure helpers over cache data take that data as arguments rather than reading the cache
  themselves — `conflictUtils` takes a `ConflictInputs`. A helper that reaches into the cache
  has a dependency React cannot see.
- An **imperative** read at call time (not during render) needs no subscription and should not
  take one; `navigation/BackHistoryTracker` re-resolves ids against the live cache this way.

---

## Data Hooks

The `useArtists()` / `useCategories()` / `useStages()` / `useEvents()` convention lives in
`store/cacheStore.ts` — see *Cache change notification* above. Alongside them, `src/hooks/`
holds the derived-data and UI concerns rather than thin cache wrappers:

```
useTimelineData   — lanes, layout and day data for a timeline screen
useArtistDerived  — per-artist derived fields, incl. the detail conflict map
useArtistBio      — bio for the detail screen, incl. loading/absent states
useLayoutMode / useBottomSheetMount / useExclusiveOverlay
```

---

## Shared Types

Import `DbArtist`, `DbCategory`, `DbStage`, `DbEvent`, `DbUserInterest` directly from:

```
app/backend/shared/types.ts
```

Do not duplicate. `src/types/backend.ts` re-exports; it is not a second definition.
