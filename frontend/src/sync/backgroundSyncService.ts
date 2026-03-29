import { baPublicApiAdapter } from '../adapters/baPublicApiAdapter';
import { createDataCollector, hasCachedData, populateCache } from '../cache/cacheService';
import { getSyncInterval } from './festivalConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncCallbacks = {
  onFirstLoadSuccess: () => void;
  onFirstLoadError: (error: Error) => void;
  onRefreshComplete: () => void;
  onSyncTimeUpdated: (time: number) => void;
};

// ── State ─────────────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setTimeout> | null = null;
let isFirstLoad = true;

// ── Core sync logic ───────────────────────────────────────────────────────────

async function runSync(
  slug: string,
  lastSyncTime: number,
  callbacks: SyncCallbacks,
): Promise<void> {
  try {
    const isUpToDate = await baPublicApiAdapter.validate(slug, lastSyncTime);

    if (isUpToDate && hasCachedData(slug)) {
      if (isFirstLoad) {
        isFirstLoad = false;
        callbacks.onFirstLoadSuccess();
      }
      return;
    }

    const collector = createDataCollector();
    await baPublicApiAdapter.populate(slug, collector);
    populateCache(slug, collector.build());

    const now = Date.now();
    callbacks.onSyncTimeUpdated(now);

    if (isFirstLoad) {
      isFirstLoad = false;
      callbacks.onFirstLoadSuccess();
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

// ── Scheduling ─────────────────────────────────────────────────────────────────

function scheduleNext(
  slug: string,
  lastSyncTime: number,
  callbacks: SyncCallbacks,
): void {
  const interval = getSyncInterval(slug);

  // TODO: have something smarter?  check how this works on sleep/resume/kill/restart
  intervalHandle = setTimeout(() => {
    runSync(slug, lastSyncTime, callbacks).then(() => {
      scheduleNext(slug, lastSyncTime, callbacks);
    });
  }, interval);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function startSync(
  slug: string,
  lastSyncTime: number,
  callbacks: SyncCallbacks,
): void {
  stop();
  isFirstLoad = true;

  // Run immediately on start, then schedule recurring checks.
  runSync(slug, lastSyncTime, callbacks).then(() => {
    scheduleNext(slug, lastSyncTime, callbacks);
  });
}

export function triggerManualSync(
  slug: string,
  lastSyncTime: number,
  callbacks: SyncCallbacks,
): void {
  runSync(slug, lastSyncTime, callbacks);
}

export function stop(): void {
  if (intervalHandle !== null) {
    clearTimeout(intervalHandle);
    intervalHandle = null;
  }
}
