import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useSelectedSlug } from '../../store/AppContext';
import { useAuth } from '../../auth/AuthContext';
import {
  type InterestStatus,
  type LocalInterest,
  getLocalInterests,
  mergeServerInterests,
  setInterest,
} from '../../cache/cacheService';
import {
  fetchUserInterests,
  putUserInterest,
  deleteUserInterest,
} from '../../adapters/baUserApiAdapter';

// Re-export so existing callsites (ArtistListFilterContext, etc.)
// continue to import InterestStatus from here without any changes.
export type { InterestStatus };

// ── Types ─────────────────────────────────────────────────────────────────────

// Local React state only needs the status value; updatedAt is managed by cacheService.
type InterestMap = Record<string, InterestStatus>; // artistId → status

export type CycleStatusResult = {
  next: InterestStatus;
  promise: Promise<LocalInterest>; // resolves when local persistence is complete
};

type InterestStateContextValue = {
  interests: InterestMap;
  getStatus: (artistId: string) => InterestStatus;
};

type InterestCycleContextValue = {
  /** The pick now, read at call time (a press, a handler): never re-renders its user. */
  getStatus: (artistId: string) => InterestStatus;
  cycleStatus: (artistId: string) => CycleStatusResult;
  /** Sets a status directly, as the star selector does: no steps between. */
  setStatus: (artistId: string, status: InterestStatus) => CycleStatusResult;
  // Re-fetches server interests and merges them into local state (picks up edits
  // made on another device). No-op when signed out. Stable across interest changes.
  refreshFromServer: () => Promise<void>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// One tap = one step: none → maybe → will_go → dont_go → none.
export const INTEREST_CYCLE: readonly InterestStatus[] = ['none', 'maybe', 'will_go', 'dont_go'];

export function nextStatus(current: InterestStatus): InterestStatus {
  return INTEREST_CYCLE[(INTEREST_CYCLE.indexOf(current) + 1) % INTEREST_CYCLE.length];
}

// Status to PUT to the server, or null for 'none' (caller should DELETE instead).
function toServerStatus(status: InterestStatus): Exclude<InterestStatus, 'none'> | null {
  return status === 'none' ? null : status;
}

// Converts a LocalInterest map (from cacheService) to a plain status map
// suitable for React state, omitting 'none' entries.
function toStatusMap(localMap: Record<string, LocalInterest>): InterestMap {
  const result: InterestMap = {};
  for (const [artistId, record] of Object.entries(localMap)) {
    if (record.status !== 'none') {
      result[artistId] = record.status;
    }
  }
  return result;
}

// ── The picks, as a small store ───────────────────────────────────────────────
//
// The one copy of my picks in memory. Readers subscribe to as much as they draw:
// a row to its own artist's pick (useInterestStatus), so a press renders that
// row alone; the screens and providers that derive from every pick to the whole
// map (useInterest). Each change is a new map, never an edit of the old one, as
// useSyncExternalStore needs.

type InterestStore = {
  get: () => InterestMap;
  set: (next: InterestMap) => void;
  subscribe: (listener: () => void) => () => void;
};

function createInterestStore(initial: InterestMap): InterestStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next) => {
      current = next;
      listeners.forEach((listener) => { listener(); });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/**
 * Starts from the interests StartupGate already loaded into memory, rather than
 * hydrating in an effect: an effect would commit the screen once with no stars
 * and again with them, and let anything mounting meanwhile read the empty map.
 * The gate unmounts this provider on an edition switch and loads the new
 * edition before mounting it again, so reading once at creation is enough.
 */
function initialInterests(slug: string): InterestMap {
  return toStatusMap(getLocalInterests(slug) ?? {});
}

// ── Contexts ──────────────────────────────────────────────────────────────────

// Separate contexts so components can subscribe to only what they need:
// - InterestStateContext changes whenever any interest status changes
// - InterestCycleContext is stable and only changes when the slug changes
const InterestStateContext = createContext<InterestStateContextValue | null>(null);
const InterestCycleContext = createContext<InterestCycleContextValue | null>(null);
// The store itself, for useInterestStatus. Stable for the provider's life.
const InterestStoreContext = createContext<InterestStore | null>(null);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const selectedSlug = useSelectedSlug();
  const { isLoggedIn, getAccessToken } = useAuth();
  const [store] = useState(() => createInterestStore(initialInterests(selectedSlug)));
  const interests = useSyncExternalStore(store.subscribe, store.get, store.get);

  // Fetches server interests and merges them with local state.
  // Called on login and on slug change while logged in.
  const syncFromServer = useCallback(async (slug: string): Promise<void> => {
    const token = await getAccessToken();
    if (token === null) { return; }

    const serverInterests = await fetchUserInterests(slug, token);
    const merged = await mergeServerInterests(slug, serverInterests);
    store.set(toStatusMap(merged));

    // Push back any local interests that won the merge (local.updatedAt was newer).
    // This syncs changes made offline or on another device that we just merged locally.
    const pushToken = await getAccessToken(); // may have refreshed
    if (pushToken === null) { return; }

    const serverByKey = new Map(serverInterests.map((s) => [s.slugArtistId, s]));
    for (const [artistId, record] of Object.entries(merged)) {
      const serverEntry = serverByKey.get(`${slug}#${artistId}`);
      const localIsNewer =
        serverEntry === undefined || record.updatedAt > serverEntry.updatedAt;

      if (!localIsNewer) { continue; }

      const serverStatus = toServerStatus(record.status);
      if (serverStatus !== null) {
        putUserInterest(slug, artistId, serverStatus, pushToken).catch(() => undefined);
      } else {
        // status is 'none' but server had an entry — delete it
        if (serverEntry !== undefined) {
          deleteUserInterest(slug, artistId, pushToken).catch(() => undefined);
        }
      }
    }
  }, [getAccessToken, store]);

  // Local picks are already in the initial state; merge the server's copy in if
  // signed in. Logging in later is handled by the effect below.
  useEffect(() => {
    if (isLoggedIn) {
      syncFromServer(selectedSlug).catch(() => undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  // When auth state transitions to logged-in, fetch and merge server interests
  // for the current slug.
  const prevLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    const justLoggedIn = !prevLoggedInRef.current && isLoggedIn;
    prevLoggedInRef.current = isLoggedIn;
    if (justLoggedIn) {
      syncFromServer(selectedSlug).catch(() => undefined);
    }
  }, [isLoggedIn, selectedSlug, syncFromServer]);

  const getStatus = useCallback(
    (artistId: string): InterestStatus => {
      return interests[artistId] ?? 'none';
    },
    [interests],
  );

  // The same, read from the store at call time: stable across picks.
  const getCurrentStatus = useCallback(
    (artistId: string): InterestStatus => store.get()[artistId] ?? 'none',
    [store],
  );

  const setStatus = useCallback(
    (artistId: string, next: InterestStatus): CycleStatusResult => {
      const promise = setInterest(selectedSlug, artistId, next);
      store.set({ ...store.get(), [artistId]: next });

      // Fire-and-forget sync to server. Errors are swallowed; the merge on next
      // login/launch will reconcile any divergence using updatedAt timestamps.
      promise.then(async () => {
        const token = await getAccessToken();
        if (token === null) { return; }

        const serverStatus = toServerStatus(next);
        if (serverStatus !== null) {
          putUserInterest(selectedSlug, artistId, serverStatus, token).catch(() => undefined);
        } else {
          deleteUserInterest(selectedSlug, artistId, token).catch(() => undefined);
        }
      }).catch(() => undefined);

      return { next, promise };
    },
    [selectedSlug, getAccessToken, store],
  );

  // Reads the store, not render state, so it stays stable across picks and a
  // second press always steps on from the first.
  const cycleStatus = useCallback(
    (artistId: string): CycleStatusResult => setStatus(artistId, nextStatus(getCurrentStatus(artistId))),
    [setStatus, getCurrentStatus],
  );

  // Manual refresh entry point (used by the lens when a source is (re)selected).
  const refreshFromServer = useCallback(
    (): Promise<void> => syncFromServer(selectedSlug),
    [syncFromServer, selectedSlug],
  );

  const stateValue = useMemo(() => ({ interests, getStatus }), [interests, getStatus]);
  const cycleValue = useMemo(
    () => ({ getStatus: getCurrentStatus, cycleStatus, setStatus, refreshFromServer }),
    [getCurrentStatus, cycleStatus, setStatus, refreshFromServer],
  );

  return (
    <InterestStoreContext.Provider value={store}>
      <InterestCycleContext.Provider value={cycleValue}>
        <InterestStateContext.Provider value={stateValue}>
          {children}
        </InterestStateContext.Provider>
      </InterestCycleContext.Provider>
    </InterestStoreContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

// Full access — subscribes to both contexts (re-renders on any interest change).
export function useInterest() {
  const stateCtx = useContext(InterestStateContext);
  const cycleCtx = useContext(InterestCycleContext);
  if (stateCtx === null || cycleCtx === null) {
    throw new Error('useInterest must be used inside InterestProvider');
  }
  return { interests: stateCtx.interests, getStatus: stateCtx.getStatus, cycleStatus: cycleCtx.cycleStatus };
}

// Stable-only access — only subscribes to cycleStatus (never re-renders due to interest changes).
export function useInterestCycle() {
  const cycleCtx = useContext(InterestCycleContext);
  if (cycleCtx === null) {
    throw new Error('useInterestCycle must be used inside InterestProvider');
  }
  return cycleCtx;
}

/** One artist's pick: re-renders its user only when that pick changes. For rows and the star selector. */
export function useInterestStatus(artistId: string): InterestStatus {
  const store = useContext(InterestStoreContext);
  if (store === null) {
    throw new Error('useInterestStatus must be used inside InterestProvider');
  }
  const read = useCallback((): InterestStatus => store.get()[artistId] ?? 'none', [store, artistId]);
  return useSyncExternalStore(store.subscribe, read, read);
}
