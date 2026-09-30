import { baPublicApiAdapter } from '../adapters/baPublicApiAdapter';
import { startSync, stop, triggerManualSync } from './backgroundSyncService';
import type { ValidationResult } from '../adapters/dataAdapter';
import type { DataCollector } from '../cache/cacheService';

// ── Jest mocks ────────────────────────────────────────────────────────────────
// Written below the imports to satisfy import/first; babel-jest hoists
// jest.mock above them regardless, so the adapter is replaced before the module
// under test ever sees it. The factory is self-contained for that reason — a
// reference to anything in this file's scope would not survive the hoist.
//
// Mocked at the module boundary rather than at fetch/network level, as the
// backend suite does: the contract under test is the adapter interface.

jest.mock('../adapters/baPublicApiAdapter', () => ({
  baPublicApiAdapter: {
    validate: jest.fn(),
    populate: jest.fn(),
    fetchAllBios: jest.fn(),
  },
}));

const mockValidate = baPublicApiAdapter.validate as jest.MockedFunction<
  typeof baPublicApiAdapter.validate
>;
const mockPopulate = baPublicApiAdapter.populate as jest.MockedFunction<
  typeof baPublicApiAdapter.populate
>;
const mockFetchAllBios = baPublicApiAdapter.fetchAllBios as jest.MockedFunction<
  typeof baPublicApiAdapter.fetchAllBios
>;

// ── Helpers ───────────────────────────────────────────────────────────────────

// A promise whose settlement this test controls, so two runs can be interleaved
// deliberately rather than by luck of the scheduler.
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

const SERVER_SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');

function validity(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    upToDate: false,
    serverSyncedAt: SERVER_SYNCED_AT,
    artistsSyncedAt: SERVER_SYNCED_AT,
    ...overrides,
  };
}

function callbacks() {
  return {
    onFirstLoadSuccess: jest.fn(),
    onFirstLoadError: jest.fn(),
  };
}

// Lets the microtask queue drain so awaited continuations actually run.
// setTimeout rather than setImmediate: the latter is a Node global and does not
// exist under the jsdom environment the web project runs in.
const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

// The festival cache is module state keyed by slug, so each case takes an
// edition of its own rather than inheriting whatever the previous one populated.
// Cheaper and less invasive than exposing a reset on the cache for tests only.
let slugCounter = 0;
const freshSlug = (): string => `batest${++slugCounter}`;

function emptyPopulate(_slug: string, collector: DataCollector): Promise<void> {
  collector.setArtists([]);
  collector.setCategories([]);
  collector.setStages([]);
  collector.setEvents([]);
  return Promise.resolve();
}

beforeEach(() => {
  mockValidate.mockResolvedValue(validity());
  mockPopulate.mockImplementation(emptyPopulate);
  mockFetchAllBios.mockResolvedValue([]);
});

afterEach(() => {
  // Retires whatever run a test left behind, so its poll timer cannot fire into
  // the next one.
  stop();
});

// ── Overlapping runs ──────────────────────────────────────────────────────────

describe('a run superseded while its first load is in flight', () => {
  it('lets the incoming run finish its own first load', async () => {
    // This is the hang: both runs used to share one module-global isFirstLoad,
    // so the outgoing run's late continuation spent the incoming run's flag and
    // StartupGate's Promise.all never settled.
    const gateA = deferred<ValidationResult>();
    mockValidate.mockReturnValueOnce(gateA.promise);

    const cbA = callbacks();
    startSync('ba2026', cbA);
    await flush();

    // Edition switched before run A got its answer.
    const cbB = callbacks();
    startSync('ba2027', cbB);
    await flush();

    // Run A's request now comes back, after it has been superseded.
    gateA.resolve(validity());
    await flush();

    expect(cbB.onFirstLoadSuccess).toHaveBeenCalledTimes(1);
  });

  it('ignores the superseded run\'s callbacks entirely', async () => {
    const gateA = deferred<ValidationResult>();
    mockValidate.mockReturnValueOnce(gateA.promise);

    const cbA = callbacks();
    startSync('ba2026', cbA);
    await flush();

    startSync('ba2027', callbacks());
    await flush();

    gateA.resolve(validity());
    await flush();

    expect(cbA.onFirstLoadSuccess).not.toHaveBeenCalled();
    expect(cbA.onFirstLoadError).not.toHaveBeenCalled();
  });

  it('does not write the superseded edition into the cache', async () => {
    const gateA = deferred<ValidationResult>();
    mockValidate.mockReturnValueOnce(gateA.promise);

    startSync('ba2026', callbacks());
    await flush();
    startSync('ba2027', callbacks());
    await flush();

    mockPopulate.mockClear();
    gateA.resolve(validity());
    await flush();

    // Bailing at the staleness check also spares the download for an edition
    // the user has already left.
    expect(mockPopulate).not.toHaveBeenCalled();
  });
});

// ── First load ────────────────────────────────────────────────────────────────

describe('first load', () => {
  it('reports success exactly once', async () => {
    const cb = callbacks();
    startSync(freshSlug(), cb);
    await flush();

    expect(cb.onFirstLoadSuccess).toHaveBeenCalledTimes(1);
    expect(cb.onFirstLoadError).not.toHaveBeenCalled();
  });

  it('reports an error when the first fetch fails with nothing cached', async () => {
    mockValidate.mockRejectedValueOnce(new Error('offline'));

    const cb = callbacks();
    startSync(freshSlug(), cb);
    await flush();

    expect(cb.onFirstLoadError).toHaveBeenCalledTimes(1);
    expect(cb.onFirstLoadSuccess).not.toHaveBeenCalled();
  });

  it('stays silent when a later refresh fails', async () => {
    const cb = callbacks();
    startSync(freshSlug(), cb);
    await flush();
    cb.onFirstLoadError.mockClear();

    mockValidate.mockRejectedValueOnce(new Error('flaky'));
    triggerManualSync();
    await flush();

    // The cache is still good; tearing the UI down behind the user would be worse.
    expect(cb.onFirstLoadError).not.toHaveBeenCalled();
  });
});

// ── Watermark ─────────────────────────────────────────────────────────────────

describe('the freshness watermark', () => {
  it('asks /validity with 0 when nothing is cached', async () => {
    const slug = freshSlug();
    startSync(slug, callbacks());
    await flush();

    expect(mockValidate).toHaveBeenCalledWith(slug, 0);
  });

  it('carries the server\'s own time forward, never a local clock reading', async () => {
    const slug = freshSlug();
    startSync(slug, callbacks());
    await flush();

    mockValidate.mockClear();
    triggerManualSync();
    await flush();

    // A Date.now() reading here would be compared against the server's rebuild
    // time on the next poll, look newer than every rebuild, and suppress all
    // further updates.
    expect(mockValidate).toHaveBeenCalledWith(slug, SERVER_SYNCED_AT);
  });
});

// ── Restored cache ────────────────────────────────────────────────────────────

describe('when an edition is already cached', () => {
  it('opens on the cached data instead of the error screen', async () => {
    const slug = freshSlug();
    startSync(slug, callbacks());
    await flush();
    stop();

    // Same edition, but the network is gone this time.
    mockValidate.mockRejectedValue(new Error('offline'));
    const cb = callbacks();
    startSync(slug, cb);
    await flush();

    expect(cb.onFirstLoadSuccess).toHaveBeenCalledTimes(1);
    expect(cb.onFirstLoadError).not.toHaveBeenCalled();
  });
});
