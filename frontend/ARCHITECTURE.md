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
  store/          # App context + startup gate + UI-state persistence
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
- Context also exposes the cache-refresh emitter (`subscribeToCacheRefresh` / `emitCacheRefresh`)
  and a monotonic `getRefreshEpoch()`.

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

function populateCache(slug: string, data: CacheData, syncedAt: number): void;
function getSyncWatermark(slug: string): number;
async function hydrateFestivalCache(slug: string): Promise<boolean>;
```

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
   e. Emit `cacheRefreshed` (via the gate's callbacks).
4. Can be triggered manually (`triggerManualSync`).

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

## UI Refresh Pattern

- `AppContext` exposes a `cacheRefreshed` event.
- Components subscribe via `useCacheRefresh(callback)`.
- On event: component re-reads from cache and re-renders.
- React Native has no built-in event bus; the emitter is a lightweight custom implementation
  inside Context.
- A monotonic `refreshEpoch` lets late-mounting subscribers detect a refresh that fired before
  they subscribed.
- Components handle their own change detection — no centrally pushed diffs.

**Known weakness** — see *Deferred / known gaps* below. Only some cache-reading modules actually
subscribe; the rest are correct because a subscribed parent happens to re-render them.

---

## Data Hooks

The planned `useArtists()` / `useCategories()` / `useStages()` / `useEvents()` convention was
**not** built. Components read `cacheService` directly and subscribe with `useCacheRefresh`. The
hooks that do exist are derived-data and UI concerns rather than thin cache wrappers:

```
useTimelineData   — lanes, layout and day data for a timeline screen
useArtistDerived  — per-artist derived fields
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

Carried in `ROADMAP.md` under BETA; both were deliberately not done before the 2026 festival.

- **Sync service is a module singleton, not an instance.** `isFirstLoad` in
  `backgroundSyncService.ts` is module-global and shared by overlapping runs. Switching edition
  while a first load is in flight can make run A consume run B's flag, so B reports
  `onRefreshComplete` instead of `onFirstLoadSuccess`, `StartupGate`'s `Promise.all` never settles,
  and the splash hangs with no error. Fix: one instance per startup run with a generation token.
  (`stop()` clears the timer but cannot cancel an in-flight fetch.)
- **The cache→React bridge is an event emitter, not a subscribable store.** `festivalCache` lives
  outside React; only some of the modules that read it subscribe. This caused the June 2026 "empty
  conflicts view" bug; the epoch latch in `useCacheRefresh` and the eslint-disable in
  `ConflictContext` are patches around the missing invariant. Fix: `useSyncExternalStore` over the
  cache with a version counter, so forgetting to subscribe becomes impossible. Both patches should
  disappear with it — if they survive, the invariant still is not enforced.

Smaller open items: `slugAdapter` is still a mockup; category **reorder** persistence was planned
and never built (hiding is persisted); `AppContext` has a TODO to roll the default slug forward
automatically once an edition is over; `scheduleNext` has no `AppState` handling for
sleep/resume/kill.
