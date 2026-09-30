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
import { currentTimeMs } from '../utils/clock';

// ── Types ─────────────────────────────────────────────────────────────────────

// Only the first-load outcome is reported. Telling React about refreshed data
// is no longer this service's job: every cacheService write notifies the cache
// store's subscribers directly, so a consumer cannot miss one.
type SyncCallbacks = {
  onFirstLoadSuccess: () => void;
  onFirstLoadError: (error: Error) => void;
};

/**
 * One startup run: a slug, the gate waiting on it, and its own first-load flag
 * and timer.
 *
 * All of this used to be module-global, which meant overlapping runs shared it.
 * Switching edition while a first load was in flight let the outgoing run's late
 * continuation consume the incoming run's `isFirstLoad`; the incoming run then
 * found the flag already spent, never called `onFirstLoadSuccess`, and the
 * `Promise.all` in StartupGate never settled — the splash hung with no error.
 * Per-run state makes that impossible: a run can only ever spend its own flag.
 */
type SyncRun = {
  readonly slug: string;
  readonly callbacks: SyncCallbacks;
  isFirstLoad: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

// ── State ─────────────────────────────────────────────────────────────────────

// The one run allowed to report progress and schedule polls. Its identity is the
// generation token: `stop()` and `startSync()` replace it, and every
// continuation re-checks it after each await, so a superseded run goes quiet
// rather than racing the run that replaced it.
let activeRun: SyncRun | null = null;

/**
 * True once this run has been superseded or stopped.
 *
 * `clearTimeout` can only cancel the *next* poll; a fetch already in flight
 * cannot be called back. So rather than trying to cancel the work, a superseded
 * run is allowed to finish and then discarded — it must not touch the cache, the
 * gate, or the schedule on its way out. Its pending promise is simply abandoned;
 * nothing awaits it any more. (Aborting the fetch itself would need an
 * AbortController threaded through the adapter.)
 */
function isStale(run: SyncRun): boolean {
  return activeRun !== run;
}

// ── Core sync logic ───────────────────────────────────────────────────────────

// The watermark is read from the cache on every run rather than carried in a
// parameter: it advances with each successful populate, and a captured copy
// would keep asking /validity about the state the app booted in — which always
// answers "changed" and turns every poll into a full re-download.
async function runSync(run: SyncRun): Promise<void> {
  const { slug } = run;
  try {
    const { upToDate, serverSyncedAt, artistsSyncedAt } = await baPublicApiAdapter.validate(
      slug,
      getSyncWatermark(slug),
    );
    // Superseded while /validity was outstanding: stop before touching anything.
    // Bailing here also spares the full download for an edition the user has
    // already left — that poll is the backend's most-requested path.
    if (isStale(run)) { return; }

    // Bios outlive a schedule-only change, so this only bites when the artists
    // themselves were rebuilt.
    invalidateBiosIfStale(slug, artistsSyncedAt);

    if (upToDate && hasCachedData(slug)) {
      // Still worth a look: a previous run may have loaded the datasets while
      // the bios failed, or the invalidation above may have just dropped them.
      void syncBios(slug, artistsSyncedAt);
      finishFirstLoad(run);
      return;
    }

    // Deliberately not awaited: the bios are an order of magnitude larger than
    // the datasets, and making the first paint wait for them is exactly what
    // splitting them out of the artists payload was meant to avoid.
    void syncBios(slug, artistsSyncedAt);

    const collector = createDataCollector();
    await baPublicApiAdapter.populate(slug, collector);
    if (isStale(run)) { return; }

    // Written together: the data and the server time it corresponds to. Taken
    // from the validate response, so a rebuild that lands between the two calls
    // is picked up by the next run instead of being skipped.
    populateCache(slug, collector.build(), serverSyncedAt);

    // Nothing to announce on a refresh — populateCache has already notified the
    // cache store's subscribers.
    finishFirstLoad(run);
  } catch (error) {
    if (isStale(run) || !run.isFirstLoad) {
      // Superseded, or a later poll failed: keep the existing cache and retry on
      // the next interval rather than tearing the UI down behind the user.
      return;
    }
    run.isFirstLoad = false;
    run.callbacks.onFirstLoadError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Editions whose bulk bio fetch is in flight. A set rather than a single slug:
// two overlapping runs fetch different editions, and one clearing the other's
// marker on the way out would let a duplicate fetch start.
const biosInFlight = new Set<string>();

// Fetches this edition's bios unless they are already cached. Runs beside the
// dataset fetch rather than before it and never rejects: without bios the
// detail screen says so, which is strictly better than blocking the app.
//
// Deliberately not tied to a run: bios are keyed by slug, so they stay correct
// (and worth keeping) even if the edition they belong to is no longer the one on
// screen. It touches the cache only, never the gate or the schedule.
async function syncBios(
  slug: string,
  artistsSyncedAt: number,
): Promise<void> {
  if (hasBios(slug) || biosInFlight.has(slug)) {
    return;
  }

  biosInFlight.add(slug);
  setBiosLoading(slug, true);
  try {
    const entries = await baPublicApiAdapter.fetchAllBios(slug);
    putArtistBios(slug, entries, artistsSyncedAt);
  } catch (error) {
    if (__DEV__) { console.warn('[sync] artist bios not fetched', error); }
  } finally {
    biosInFlight.delete(slug);
    // Either way the answer changed: a detail screen on a spinner has to learn
    // that the bios arrived, or that they are not coming. Clearing the flag is
    // itself a cache mutation, so the store notifies for us.
    setBiosLoading(slug, false);
  }
}

function finishFirstLoad(run: SyncRun): void {
  if (isStale(run) || !run.isFirstLoad) {
    return;
  }
  run.isFirstLoad = false;
  run.callbacks.onFirstLoadSuccess();
}

// ── Scheduling ─────────────────────────────────────────────────────────────────

function scheduleNext(run: SyncRun): void {
  if (isStale(run)) {
    return;
  }

  // TODO: have something smarter?  check how this works on sleep/resume/kill/restart
  run.timer = setTimeout(() => {
    if (isStale(run)) { return; }
    void runSync(run).then(() => { scheduleNext(run); });
  }, getSyncInterval(run.slug, currentTimeMs()));
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Startup order: persisted data first, network second. A restore releases the
// splash immediately and lets the freshness check run behind an already usable
// UI — so a cold start with no connectivity opens on the last known schedule
// instead of the error screen.
async function bootstrap(run: SyncRun): Promise<void> {
  const restored = await hydrateFestivalCache(run.slug);
  if (isStale(run)) { return; }

  if (restored) {
    finishFirstLoad(run);
  }

  await runSync(run);
  scheduleNext(run);
}

/**
 * Begins a startup run for `slug`, superseding any run already under way.
 * Exactly one run is ever current; see `SyncRun`.
 */
export function startSync(slug: string, callbacks: SyncCallbacks): void {
  stop();
  const run: SyncRun = { slug, callbacks, isFirstLoad: true, timer: null };
  activeRun = run;
  void bootstrap(run);
}

/**
 * Refreshes the current run now, outside its schedule (pull-to-refresh).
 * Takes no slug on purpose: the active run owns the one being synced, so there
 * is no way for a caller to ask for an edition that is no longer on screen.
 * A no-op when nothing is running.
 */
export function triggerManualSync(): void {
  if (activeRun === null) {
    return;
  }
  void runSync(activeRun);
}

/** Stops the current run: cancels its next poll and retires it. */
export function stop(): void {
  if (activeRun === null) {
    return;
  }
  if (activeRun.timer !== null) {
    clearTimeout(activeRun.timer);
    activeRun.timer = null;
  }
  // Clearing the pointer is what actually stops it — an in-flight fetch cannot
  // be cancelled, so the run's own continuations detect this and go quiet.
  activeRun = null;
}
