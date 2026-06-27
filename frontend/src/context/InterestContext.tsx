import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useSelectedSlug } from '../store/AppContext';
import { useAuth } from './AuthContext';
import {
  type InterestStatus,
  type LocalInterest,
  hydrateInterests,
  mergeServerInterests,
  setInterest,
} from '../cache/cacheService';
import {
  fetchUserInterests,
  putUserInterest,
  deleteUserInterest,
} from '../adapters/baUserApiAdapter';

// Re-export so existing callsites (ArtistListFilterContext, InterestFilterControl, etc.)
// continue to import InterestStatus from here without any changes.
export type { InterestStatus };

// ── Types ─────────────────────────────────────────────────────────────────────

// Local React state only needs the status value; updatedAt is managed by cacheService.
type InterestMap = Record<string, InterestStatus>; // artistId → status

type InterestState = {
  interests: InterestMap;
  isHydrated: boolean;
};

type InterestAction =
  | { type: 'HYDRATE'; interests: InterestMap }
  | { type: 'SET'; artistId: string; status: InterestStatus };

export type CycleStatusResult = {
  next: InterestStatus;
  promise: Promise<LocalInterest>; // resolves when local persistence is complete
};

type InterestStateContextValue = {
  interests: InterestMap;
  getStatus: (artistId: string) => InterestStatus;
};

type InterestCycleContextValue = {
  cycleStatus: (artistId: string) => CycleStatusResult;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function nextStatus(current: InterestStatus): InterestStatus {
  if (current === 'none') { return 'maybe'; }
  if (current === 'maybe') { return 'must_see'; }
  return 'none';
}

// Maps local InterestStatus to the server's status field.
// Returns null for 'none' (caller should DELETE instead of PUT).
function toServerStatus(status: InterestStatus): 'will_go' | 'maybe' | null {
  if (status === 'must_see') { return 'will_go'; }
  if (status === 'maybe') { return 'maybe'; }
  return null;
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

// ── Reducer ───────────────────────────────────────────────────────────────────

function interestReducer(state: InterestState, action: InterestAction): InterestState {
  switch (action.type) {
    case 'HYDRATE':
      return { interests: action.interests, isHydrated: true };
    case 'SET':
      return {
        ...state,
        interests: { ...state.interests, [action.artistId]: action.status },
      };
  }
}

// ── Contexts ──────────────────────────────────────────────────────────────────

// Separate contexts so components can subscribe to only what they need:
// - InterestStateContext changes whenever any interest status changes
// - InterestCycleContext is stable and only changes when the slug changes
const InterestStateContext = createContext<InterestStateContextValue | null>(null);
const InterestCycleContext = createContext<InterestCycleContextValue | null>(null);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const selectedSlug = useSelectedSlug();
  const { isLoggedIn, getAccessToken } = useAuth();
  const [state, dispatch] = useReducer(interestReducer, {
    interests: {},
    isHydrated: false,
  });

  // Ref so cycleStatus can read current state without it being a dependency,
  // keeping cycleStatus stable across interest updates.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Fetches server interests and merges them with local state.
  // Called on login and on slug change while logged in.
  const syncFromServer = useCallback(async (slug: string): Promise<void> => {
    const token = await getAccessToken();
    if (token === null) { return; }

    const serverInterests = await fetchUserInterests(slug, token);
    const merged = await mergeServerInterests(slug, serverInterests);
    dispatch({ type: 'HYDRATE', interests: toStatusMap(merged) });

    // Push back any local interests that won the merge (local.updatedAt was newer).
    // This syncs changes made offline or on another device that we just merged locally.
    const pushToken = await getAccessToken(); // may have refreshed
    if (pushToken === null) { return; }

    for (const [artistId, record] of Object.entries(merged)) {
      const serverEntry = serverInterests.find(
        (s) => s.slugArtistId === `${slug}#${artistId}`,
      );
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
  }, [getAccessToken]);

  // Hydrate from AsyncStorage whenever the slug changes, then merge from server
  // if the user is logged in.
  useEffect(() => {
    hydrateInterests(selectedSlug).then((localMap) => {
      dispatch({ type: 'HYDRATE', interests: toStatusMap(localMap) });
      if (isLoggedIn) {
        syncFromServer(selectedSlug).catch(() => undefined);
      }
    });
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
      return state.interests[artistId] ?? 'none';
    },
    [state.interests],
  );

  // cycleStatus reads state via ref so it stays stable across interest updates.
  const cycleStatus = useCallback(
    (artistId: string): CycleStatusResult => {
      const current = stateRef.current.interests[artistId] ?? 'none';
      const next = nextStatus(current);
      const promise = setInterest(selectedSlug, artistId, next);
      dispatch({ type: 'SET', artistId, status: next });

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
    [selectedSlug, getAccessToken],
  );

  const stateValue = useMemo(() => ({ interests: state.interests, getStatus }), [state.interests, getStatus]);
  const cycleValue = useMemo(() => ({ cycleStatus }), [cycleStatus]);

  return (
    <InterestCycleContext.Provider value={cycleValue}>
      <InterestStateContext.Provider value={stateValue}>
        {children}
      </InterestStateContext.Provider>
    </InterestCycleContext.Provider>
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
