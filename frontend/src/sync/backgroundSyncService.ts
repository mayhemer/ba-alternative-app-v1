import { baPublicApiAdapter } from '../adapters/baPublicApiAdapter';
import {
  createDataCollector,
  getSyncWatermark,
  hasBios,
  hasCachedData,
  hydrateFestivalCache,
  invalidateBiosIfStale,
  populateCache,
  putArtistBios,
  setBiosLoading,
} from '../cache/cacheService';
import { getSyncInterval } from './festivalConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

// Only the first-load outcome is reported. Telling React about refreshed data
// is no longer this service's job: every cacheService write notifies the cache
// store's subscribers directly, so a consumer cannot miss one.
type SyncCallbacks = {
  onFirstLoadSuccess: () => void;
  onFirstLoadError: (error: Error) => void;
};

// ── State ─────────────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setTimeout> | null = null;
let isFirstLoad = true;

// ── Core sync logic ───────────────────────────────────────────────────────────

// The watermark is read from the cache on every run rather than carried in a
// parameter: it advances with each successful populate, and a captured copy
// would keep asking /validity about the state the app booted in — which always
// answers "changed" and turns every poll into a full re-download.
async function runSync(slug: string, callbacks: SyncCallbacks): Promise<void> {
  try {
    const { upToDate, serverSyncedAt, artistsSyncedAt } = await baPublicApiAdapter.validate(
      slug,
      getSyncWatermark(slug),
    );

    // Bios outlive a schedule-only change, so this only bites when the artists
    // themselves were rebuilt.
    invalidateBiosIfStale(slug, artistsSyncedAt);

    if (upToDate && hasCachedData(slug)) {
      // Still worth a look: a previous run may have loaded the datasets while
      // the bios failed, or the invalidation above may have just dropped them.
      void syncBios(slug, artistsSyncedAt);
      finishFirstLoad(callbacks);
      return;
    }

    // Deliberately not awaited: the bios are an order of magnitude larger than
    // the datasets, and making the first paint wait for them is exactly what
    // splitting them out of the artists payload was meant to avoid.
    void syncBios(slug, artistsSyncedAt);

    const collector = createDataCollector();
    await baPublicApiAdapter.populate(slug, collector);
    // Written together: the data and the server time it corresponds to. Taken
    // from the validate response, so a rebuild that lands between the two calls
    // is picked up by the next run instead of being skipped.
    populateCache(slug, collector.build(), serverSyncedAt);

    // Nothing to announce on a refresh — populateCache has already notified the
    // cache store's subscribers.
    finishFirstLoad(callbacks);
  } catch (error) {
    if (isFirstLoad) {
      isFirstLoad = false;
      callbacks.onFirstLoadError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    // Subsequent failures are silent — keep existing cache, retry on next interval.
  }
}

// Fetches this edition's bios unless they are already cached. Runs beside the
// dataset fetch rather than before it and never rejects: without bios the
// detail screen says so, which is strictly better than blocking the app.
let biosInFlight: string | null = null;

async function syncBios(
  slug: string,
  artistsSyncedAt: number,
): Promise<void> {
  if (hasBios(slug) || biosInFlight === slug) {
    return;
  }

  biosInFlight = slug;
  setBiosLoading(slug, true);
  try {
    const entries = await baPublicApiAdapter.fetchAllBios(slug);
    putArtistBios(slug, entries, artistsSyncedAt);
  } catch (error) {
    if (__DEV__) { console.warn('[sync] artist bios not fetched', error); }
  } finally {
    biosInFlight = null;
    // Either way the answer changed: a detail screen on a spinner has to learn
    // that the bios arrived, or that they are not coming. Clearing the flag is
    // itself a cache mutation, so the store notifies for us.
    setBiosLoading(slug, false);
  }
}

function finishFirstLoad(callbacks: SyncCallbacks): void {
  if (!isFirstLoad) {
    return;
  }
  isFirstLoad = false;
  callbacks.onFirstLoadSuccess();
}

// ── Scheduling ─────────────────────────────────────────────────────────────────

function scheduleNext(slug: string, callbacks: SyncCallbacks): void {
  const interval = getSyncInterval(slug);

  // TODO: have something smarter?  check how this works on sleep/resume/kill/restart
  intervalHandle = setTimeout(() => {
    runSync(slug, callbacks).then(() => {
      scheduleNext(slug, callbacks);
    });
  }, interval);
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Startup order: persisted data first, network second. A restore releases the
// splash immediately and lets the freshness check run behind an already usable
// UI — so a cold start with no connectivity opens on the last known schedule
// instead of the error screen.
async function bootstrap(slug: string, callbacks: SyncCallbacks): Promise<void> {
  const restored = await hydrateFestivalCache(slug);
  if (restored) {
    finishFirstLoad(callbacks);
  }

  await runSync(slug, callbacks);
  scheduleNext(slug, callbacks);
}

export function startSync(slug: string, callbacks: SyncCallbacks): void {
  stop();
  isFirstLoad = true;
  void bootstrap(slug, callbacks);
}

export function triggerManualSync(slug: string, callbacks: SyncCallbacks): void {
  runSync(slug, callbacks);
}

export function stop(): void {
  if (intervalHandle !== null) {
    clearTimeout(intervalHandle);
    intervalHandle = null;
  }
}
