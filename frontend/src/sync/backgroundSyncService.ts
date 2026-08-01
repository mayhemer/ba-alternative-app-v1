import { baPublicApiAdapter } from '../adapters/baPublicApiAdapter';
import {
  createDataCollector,
  getSyncWatermark,
  hasCachedData,
  hydrateFestivalCache,
  populateCache,
} from '../cache/cacheService';
import { getSyncInterval } from './festivalConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncCallbacks = {
  onFirstLoadSuccess: () => void;
  onFirstLoadError: (error: Error) => void;
  onRefreshComplete: () => void;
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
    const { upToDate, serverSyncedAt } = await baPublicApiAdapter.validate(
      slug,
      getSyncWatermark(slug),
    );

    if (upToDate && hasCachedData(slug)) {
      finishFirstLoad(callbacks);
      return;
    }

    const collector = createDataCollector();
    await baPublicApiAdapter.populate(slug, collector);
    // Written together: the data and the server time it corresponds to. Taken
    // from the validate response, so a rebuild that lands between the two calls
    // is picked up by the next run instead of being skipped.
    populateCache(slug, collector.build(), serverSyncedAt);

    if (isFirstLoad) {
      finishFirstLoad(callbacks);
    } else {
      callbacks.onRefreshComplete();
    }
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
