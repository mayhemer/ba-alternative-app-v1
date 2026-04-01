import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useAppState } from '../store/AppContext';
import {
  type InterestStatus,
  type LocalInterest,
  hydrateInterests,
  setInterest,
} from '../cache/cacheService';

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

function nextStatus(current: InterestStatus): InterestStatus {
  if (current === 'none') { return 'maybe'; }
  if (current === 'maybe') { return 'must_see'; }
  return 'none';
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
  const { selectedSlug } = useAppState();
  const [state, dispatch] = useReducer(interestReducer, {
    interests: {},
    isHydrated: false,
  });

  // Ref so cycleStatus can read current state without it being a dependency,
  // keeping cycleStatus stable across interest updates.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Hydrate from AsyncStorage (via cacheService) whenever the slug changes.
  useEffect(() => {
    hydrateInterests(selectedSlug).then((map) => {
      // Convert LocalInterest map → plain status map for React state
      const statusMap: InterestMap = {};
      for (const [artistId, record] of Object.entries(map)) {
        if (record.status !== 'none') {
          statusMap[artistId] = record.status;
        }
      }
      dispatch({ type: 'HYDRATE', interests: statusMap });
    });
  }, [selectedSlug]);

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
      // In-memory update is synchronous; promise covers AsyncStorage write
      const promise = setInterest(selectedSlug, artistId, next);
      // Update React state so subscribers re-render
      dispatch({ type: 'SET', artistId, status: next });
      return { next, promise };
    },
    [selectedSlug],
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
