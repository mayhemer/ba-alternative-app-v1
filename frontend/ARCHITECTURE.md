# Frontend Architecture

How the frontend is actually built. This started as a set of decisions agreed before
implementation; it has since been updated to describe the shipped app. Where a v1 plan was
dropped or superseded, the note says so rather than leaving the plan standing.

Companion documents: `DESIGN.md` (screens and UI behaviour), `../FRONTEND.md` (builds,
deployment, deep links).

---

## Tech Stack

- React Native 0.81 + Expo SDK 54 (production releases only, no canary)
- NativeWind 4 (TailwindCSS for React Native); design tokens in `src/styling/tokens.*`
- React Navigation 7 (native stack + drawer)
- React Context + `useReducer` (built-in, no Zustand)
- `@react-native-async-storage/async-storage` (platform-independent persistence)
- React Native Reanimated 4 + `@gorhom/bottom-sheet` (per DESIGN.md)
- `react-native-svg` (timeline conflict markers, icons)
- AWS Cognito via `expo-auth-session` / `expo-apple-authentication` (see `src/auth/`)

---

## Folder Structure

```
src/
  adapters/       # API-specific fetchers (swappable)
  auth/           # Cognito config, token storage, sign-in/out
  cache/          # Cache service (UI's only data source) + social cache
  context/        # Feature-level React contexts (interests, lens, conflicts, social, UI)
  hooks/          # Derived-data and UI hooks
  navigation/     # Navigator, back-history tracking, share-link handling
  screens/        # Screen components
  components/     # Reusable UI components
  store/          # App context + cache store binding + startup gate + UI-state persistence
  styling/        # Design tokens
  sync/           # Background sync service + festival date config
  types/          # Backend type re-exports
  utils/          # Helpers, constants, config
```

---

## State (React Context)

`src/store/AppContext.tsx` holds the minimal global state:

```typescript
type AppState = {
  selectedSlug: string | null; // null until read from AsyncStorage on startup
  isLoading: boolean;
  lastError: string | null;
};
```

- `selectedSlug` is the only value persisted here (`app:selectedSlug`). It is `null` only until
  the startup read resolves, and always falls back to `DEFAULT_SLUG` — it can never stay null
  and deadlock the startup gate.
- Slug switcher lives in Settings screen only.
- Context exposes only the slug and the loading/error setters. Cache-change
  notification deliberately does **not** live here — see *Cache change notification* below.

**The sync watermark deliberately does not live here.** It belongs to the data it describes, so
`cacheService` owns it and persists it alongside the datasets. Holding it in React state also
re-rendered every context consumer on each poll, for a value nothing rendered.

Feature state lives in its own context under `src/context/` rather than in `AppState` —
interests, lens/scope, conflicts, social/friends, and transient screen UI.

---

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
server's clock reading. **The watermark must be the server's `lastSyncedAt`, never `Date.now()`** —
`/validity/{t}` answers `changed: lastSyncedAt > t`, so a local reading is compared against the
wrong scale and suppresses every future update.

Bios are fetched separately from `populate` because they are an order of magnitude larger than the
datasets; making first paint wait for them is what splitting them out was meant to avoid.

**Current implementations**:

| Adapter | Purpose |
|---|---|
| `baPublicApiAdapter` | Public festival data; origin `https://api.ba.janbambas.cz` |
| `baUserApiAdapter` | Authenticated interests sync |
| `baShareApiAdapter` | Share tokens and friends' schedules |

- `validate` calls `GET /{slug}/validity/{time}`.
- `populate` calls `GET /{slug}/artists`, `/categories`, `/stages`, `/schedule` in parallel.
- `fetchAllBios` calls `GET /{slug}/bios`.

**Future**: create a new adapter implementing the same interface for a different API; swap at the
factory call site.

---

## Background Sync Service

`src/sync/backgroundSyncService.ts`

### Flow

1. On app start, `startSync` bootstraps **persisted data first, network second**:
   `hydrateFestivalCache(slug)` — a successful restore finishes first load immediately, so a cold
   start with no connectivity opens on the last known schedule instead of the error screen.
2. Then `runSync`, then poll on a date-aware interval.
3. Each cycle:
   a. `adapter.validate(slug, getSyncWatermark(slug))` — the watermark is re-read from the cache
      every run, never captured in a closure.
   b. `invalidateBiosIfStale(slug, artistsSyncedAt)`; kick off `syncBios` unawaited.
   c. If `upToDate` and data is cached → done.
   d. Otherwise create a `DataCollector`, `adapter.populate(...)`, then
      `cacheService.populateCache(slug, data, serverSyncedAt)`.
   e. Nothing to announce — `populateCache` notified the cache store itself.
4. Can be triggered manually (`triggerManualSync()`), which refreshes the current run.

### Runs and supersession

State that used to be module-global — the first-load flag and the poll timer — belongs to a
**`SyncRun`**: one per `startSync` call, holding its slug, the gate's callbacks, its own
`isFirstLoad` and its own timer. Exactly one run is current at a time (`activeRun`), and that
object's **identity is the generation token**: every continuation re-checks `isStale(run)` after
each `await`, so a superseded run goes quiet instead of racing the run that replaced it.

This is what closes the edition-switch hang. Sharing `isFirstLoad` let an outgoing run's late
continuation spend the incoming run's flag; the incoming run then found it already spent, never
called `onFirstLoadSuccess`, and `StartupGate`'s `Promise.all` never settled — splash up, no
error. A run can now only ever spend its own flag.

`clearTimeout` cancels only the *next* poll; a fetch already in flight cannot be called back. So a
superseded run is not cancelled, it is **discarded** — allowed to finish, but forbidden to touch
the cache, the gate or the schedule on its way out, and its pending promise abandoned. Truly
aborting the request would need an `AbortController` threaded through the adapter.

`activeRun` is assigned in exactly two places (`startSync`, after `stop()`; and `stop()`, to
`null`), so every supersession clears the outgoing timer. `syncBios` is deliberately *not* tied to
a run: bios are keyed by slug and stay correct even once that edition leaves the screen, and it
touches only the cache. Its in-flight marker is a `Set` of slugs, not one slug, so two overlapping
runs cannot clear each other's.

### Interval configuration

Date-aware intervals are live (`src/sync/festivalConfig.ts`, `getSyncInterval(slug)`):

| Phase                  | Interval    |
|------------------------|-------------|
| Outside festival dates | 30 minutes  |
| During festival        | 3 minutes   |
| Unknown slug           | 5 minutes   |

The during-festival poll is the backend's most-requested path — every running app hits it on this
timer. One minute produced roughly three times the requests of three minutes for no practical
gain; a schedule change still surfaces within a few minutes either way.

### Error handling

| Situation                         | Behaviour                            |
|-----------------------------------|--------------------------------------|
| First load, no cache, fetch fails | Show error screen with retry button  |
| Subsequent fetch fails (cache ok) | Silent fail; retry per schedule      |
| Bio fetch fails                   | Never rejects; detail screen says so |

---

## Startup Gate

`src/store/StartupGate.tsx` is the single owner of the boot lifecycle and replaces the earlier
`RootGate`:

```
resolve slug → (load external data ∥ hydrate local state) → both done
             → lift splash, render full UI → (logged in) server interest sync
```

One `Promise.all([startSync(...), hydrateLocalState(slug)])` resolution flips splash → full UI.
`RootGate` blocked only on the external load and let providers hydrate local state late, which is
what caused the UI-state restore races. Because external load resolves from whichever source
produces data first — persisted cache or network — this gate no longer implies a round trip.

Provider order (`App.tsx`): `AppProvider → AuthProvider → StartupGate → AppContent`, with the
feature providers inside `AppContent` so they mount only once startup hydration has completed.

---

## UI State Persistence

`src/store/uiStatePersistence.ts` is the single owner of persisted UI state — components call its
API, never AsyncStorage directly. In-memory snapshot updated synchronously, writes debounced
~300 ms.

| Key | Contents |
|---|---|
| `timeline:hiddenCategories` | `string[]` |
| `timeline:scrollPositions:v2` | per screenKey, per day |
| `timeline:selectedDayStart` | per screenKey |

Timeline scroll and selected day restore on launch. **Artist list scroll restore is not
implemented** — it was attempted and reverted; `SectionList` virtualization cannot reliably
restore a position without `getItemLayout`. A `FlatList` over a pre-flattened row array is the
proposed path if it is picked up again.

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

## Splash Screen

- Native splash is held at module scope in `App.tsx` (`preventAutoHideAsync`) so the BA image
  stays up while the JS bundle evaluates; `StartupGate` owns the handover once it has painted.
- Shown while startup is in flight; activity spinner.
- On success: navigate to default or last-used screen.
- On error: show message + retry button.

---

## Shared Types

Import `DbArtist`, `DbCategory`, `DbStage`, `DbEvent`, `DbUserInterest` directly from:

```
app/backend/lambdas/shared/types.ts
```

Do not duplicate. `src/types/backend.ts` re-exports; it is not a second definition.

---

## Deferred / known gaps

Both were carried in `ROADMAP.md` under BETA, deliberately deferred past the 2026 festival, and
are now done. Kept here with their rationale because the invariants they introduced are easy to
undo by accident.

- ~~**Sync service is a module singleton, not an instance.**~~ **Done** — state is per `SyncRun`
  and supersession is detected by run identity; see *Runs and supersession* above. Still untested
  automatically: there is no test suite in `frontend/`, so the edition-switch race is verified by
  hand (switch edition on a throttled network while the first load is in flight).
- ~~**The cache→React bridge is an event emitter, not a subscribable store.**~~ **Done** — the
  emitter was replaced by `useSyncExternalStore` over a version counter owned by `cacheService`
  (see *Cache change notification*). The patches it existed to work around are gone with it: the
  epoch latch in `useCacheRefresh`, the eslint-disables in `ConflictContext`, `useTimelineData`
  and `BaseTimelineScreen`, and the `void cacheRevision` trick in `ConflictDetailSheet`.

Smaller open items: `slugAdapter` is still a mockup; category **reorder** persistence was planned
and never built (hiding is persisted); `AppContext` has a TODO to roll the default slug forward
automatically once an edition is over; `scheduleNext` has no `AppState` handling for
sleep/resume/kill.

Three `exhaustive-deps` suppressions remain in the tree (`InterestContext`, and two in
`TimelineView`). They concern scroll/day/auth effect *triggers*, not cache reads, and are
out of scope for the cache-store work above.
