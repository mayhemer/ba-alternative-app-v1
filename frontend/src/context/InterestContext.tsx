import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
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

type InterestContextValue = {
  getStatus: (artistId: string) => InterestStatus;
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

// ── Context ───────────────────────────────────────────────────────────────────

const InterestContext = createContext<InterestContextValue | null>(null);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const { selectedSlug } = useAppState();
  const [state, dispatch] = useReducer(interestReducer, {
    interests: {},
    isHydrated: false,
  });

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

  const cycleStatus = useCallback(
    (artistId: string): CycleStatusResult => {
      const current = state.interests[artistId] ?? 'none';
      const next = nextStatus(current);
      // In-memory update is synchronous; promise covers AsyncStorage write
      const promise = setInterest(selectedSlug, artistId, next);
      // Update React state so subscribers re-render
      dispatch({ type: 'SET', artistId, status: next });
      return { next, promise };
    },
    [state.interests, selectedSlug],
  );

  return (
    <InterestContext.Provider value={{ getStatus, cycleStatus }}>
      {children}
    </InterestContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInterest(): InterestContextValue {
  const ctx = useContext(InterestContext);
  if (ctx === null) {
    throw new Error('useInterest must be used inside InterestProvider');
  }
  return ctx;
}
