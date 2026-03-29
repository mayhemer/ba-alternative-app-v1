# Frontend Architecture

Architecture decisions agreed on before implementation - very first version.

---

## Tech Stack

- React Native + Expo (production releases only, no canary)
- NativeWind (TailwindCSS for React Native)
- React Navigation (stack + side drawer)
- React Context + useReducer (built-in, no Zustand)
- `@react-native-async-storage/async-storage` (platform-independent persistence)
- React Native Reanimated + react-native-bottom-sheet (per DESIGN.md)

---

## Folder Structure

```
src/
  adapters/       # API-specific fetchers (swappable)
  cache/          # Cache service (UI's only data source)
  store/          # React Context: app state + event emitter
  sync/           # Background sync service
  screens/        # Screen components
  components/     # Reusable UI components
  utils/          # Helpers, constants, config
```

---

## State (React Context)

Minimal persistent state:

```typescript
type AppState = {
  selectedSlug: string;    // persisted to AsyncStorage
  isLoading: boolean;      // true during first app load
  lastError: Error | null; // first load errors only
  lastSyncTime: number;    // timestamp of last successful sync
};
```

- `selectedSlug` is the only value persisted; other fields are ephemeral session state.
- Slug switcher lives in Settings screen only.
- Context also exposes an event emitter (`cacheRefreshed` event).

---

## Slug Adapter

`src/adapters/slugAdapter.ts` — returns the list of available festival editions.

```typescript
async function getSlugs(): Promise<string[]> {
  return ['ba2024', 'ba2025', 'ba2026']; // mockup; replace with config or endpoint later
}
```

---

## Cache Layer

`src/cache/cacheService.ts` — the **only** data source the UI reads from.

```typescript
async function getArtists(slug: string): Promise<DbArtist[]>;
async function getCategories(slug: string): Promise<DbCategory[]>;
async function getStages(slug: string): Promise<DbStage[]>;
async function getEvents(slug: string): Promise<DbEvent[]>;

async function populateCache(slug: string, data: CacheData): Promise<void>;
```

- In-memory cache for the session.
- AsyncStorage for persistence across restarts (v1: in-memory only; AsyncStorage layer added later).
- `populateCache` is called exclusively by the background sync service after a full fetch.
- No locking needed — JS is single-threaded; in-flight reads see previous data until `populateCache` completes.

---

## Adapter Interface

`src/adapters/` — API-specific fetchers. Adapters do not read the cache; they only write to a collector.

```typescript
interface DataAdapter {
  validate(slug: string, lastSyncTime: number): Promise<boolean>;
  // true  = up-to-date (no fetch needed)
  // false = server has newer data

  populate(slug: string, collector: DataCollector): Promise<void>;
  // fetches all data in parallel, writes to collector
}

interface DataCollector {
  setArtists(data: DbArtist[]): void;
  setCategories(data: DbCategory[]): void;
  setStages(data: DbStage[]): void;
  setEvents(data: DbEvent[]): void;
}
```

**Current implementation**: `baPublicApiAdapter` — hard-codes `https://api.ba.janbambas.cz` as origin.

- `validate` calls `GET /{slug}/validity/{time}` → returns `true` if up-to-date.
- `populate` calls `GET /{slug}/artists`, `/categories`, `/stages`, `/schedule` in parallel.

**Future**: create a new adapter implementing the same interface for a different API; swap at the factory call site.

---

## Background Sync Service

`src/sync/backgroundSyncService.ts`

### Flow

1. On app start: run immediately (cold load).
2. After first sync: poll on a configurable interval.
3. Each cycle:
   a. `adapter.validate(slug, lastSyncTime)` — if `true`, skip.  
   b. If `false`: create `DataCollector`, call `adapter.populate(slug, collector)`.  
   c. Call `cacheService.populateCache(slug, collectedData)`.  
   d. Update `lastSyncTime` in store.  
   e. Emit `cacheRefreshed` event.  
4. Can be triggered manually (e.g., pull-to-refresh).

### Interval configuration

Prepared for festival-date-aware intervals:

| Phase             | Interval     |
|-------------------|-------------|
| Before festival   | 30 minutes  |
| During festival   | 1 minute    |

v1: single fixed interval (configurable constant). Date-aware logic added later.

### Error handling

| Situation                        | Behaviour                             |
|----------------------------------|---------------------------------------|
| First load, no cache, fetch fails | Show error screen with retry button  |
| Subsequent fetch fails (cache ok) | Silent fail; retry per schedule      |

---

## UI Refresh Pattern

- Context exposes a `cacheRefreshed` event.
- Components subscribe via a `useCacheRefreshed(callback)` hook.
- On event: component re-reads from cache and re-renders.
- React Native has no built-in event bus; the emitter is a lightweight custom implementation inside Context.
- Components handle their own change detection — no centrally pushed diffs.

---

## Data Hooks (convention)

```typescript
function useArtists(): DbArtist[];
function useCategories(): DbCategory[];
function useStages(): DbStage[];
function useEvents(): DbEvent[];
```

Internally: read from cache, subscribe to `cacheRefreshed`, re-fetch on event.

---

## Splash Screen

- Shown on app launch while `isLoading === true`.
- Activity spinner (cycling progress indicator).
- On success: navigate to default or last-used screen.
- On error: show message + retry button.

---

## Shared Types

Import `DbArtist`, `DbCategory`, `DbStage`, `DbEvent`, `DbUserInterest` directly from:

```
app/backend/lambdas/shared/types.ts
```

Do not duplicate.

---

## Implementation Order

1. `expo init` + NativeWind setup
2. Store + Context + event emitter
3. Cache service (in-memory)
4. `baPublicApiAdapter` + `slugAdapter`
5. Background sync service
6. Splash screen + root navigation
7. UI screens and components (per DESIGN.md)

---

## Open / Future

- AsyncStorage cache persistence (v1 skips this)
- Festival-date-aware sync intervals
- `/{slug}/validity/{time}` integration (prepared, not wired in v1)
- Conflict detection warnings
- Category reorder/hide persistence
- User interests (authenticated endpoints)
