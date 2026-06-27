import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState = {
  // null until the persisted slug has been read from AsyncStorage on startup;
  // thereafter always a real slug. This is the single source of truth for
  // "is the slug known yet" — RootGate holds the first sync until it resolves.
  selectedSlug: string | null;
  isLoading: boolean;
  lastError: string | null;
  lastSyncTime: number;
};

type AppAction =
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SYNC_TIME'; time: number };

type CacheRefreshListener = () => void;

type AppContextValue = {
  state: AppState;
  setSelectedSlug: (slug: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSyncTime: (time: number) => void;
  subscribeToCacheRefresh: (listener: CacheRefreshListener) => () => void;
  emitCacheRefresh: () => void;
  getRefreshEpoch: () => number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_SLUG = 'app:selectedSlug';
const DEFAULT_SLUG = 'ba2025';

// ── Reducer ───────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SLUG':
      return { ...state, selectedSlug: action.slug };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, lastError: action.error };
    case 'SET_SYNC_TIME':
      return { ...state, lastSyncTime: action.time };
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    selectedSlug: null,
    isLoading: true,
    lastError: null,
    lastSyncTime: 0,
  });

  // Event emitter for cache refresh notifications.
  const refreshListeners = useRef<Set<CacheRefreshListener>>(new Set());
  // Monotonic counter bumped on every emitCacheRefresh. Lets late-mounting
  // subscribers detect a refresh that fired before they subscribed (see useCacheRefresh).
  const refreshEpoch = useRef(0);

  // Resolve selectedSlug from AsyncStorage on mount. Always dispatches a real
  // slug — falling back to DEFAULT_SLUG on a missing value or a read error — so
  // the slug can never stay null and deadlock RootGate's first-sync gate.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_SLUG)
      .then((stored) => {
        dispatch({ type: 'SET_SLUG', slug: stored ?? DEFAULT_SLUG });
      })
      .catch(() => {
        dispatch({ type: 'SET_SLUG', slug: DEFAULT_SLUG });
      });
  }, []);

  // Persist selectedSlug to AsyncStorage whenever it changes. Skipped while
  // unresolved so we never overwrite the stored slug with a placeholder.
  useEffect(() => {
    if (state.selectedSlug === null) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY_SLUG, state.selectedSlug);
  }, [state.selectedSlug]);

  const setSelectedSlug = useCallback((slug: string): void => {
    dispatch({ type: 'SET_SLUG', slug });
  }, []);

  const setLoading = useCallback((loading: boolean): void => {
    dispatch({ type: 'SET_LOADING', loading });
  }, []);

  const setError = useCallback((error: string | null): void => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const setSyncTime = useCallback((time: number): void => {
    dispatch({ type: 'SET_SYNC_TIME', time });
  }, []);

  const subscribeToCacheRefresh = useCallback((listener: CacheRefreshListener): () => void => {
    refreshListeners.current.add(listener);
    return () => {
      refreshListeners.current.delete(listener);
    };
  }, []);

  const emitCacheRefresh = useCallback((): void => {
    refreshEpoch.current += 1;
    refreshListeners.current.forEach((listener) => listener());
  }, []);

  const getRefreshEpoch = useCallback((): number => refreshEpoch.current, []);

  const value: AppContextValue = {
    state,
    setSelectedSlug,
    setLoading,
    setError,
    setSyncTime,
    subscribeToCacheRefresh,
    emitCacheRefresh,
    getRefreshEpoch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}

export function useAppState(): AppState {
  return useAppContext().state;
}

// Returns the resolved slug. Safe to call anywhere below RootGate's loading
// gate, where the slug is guaranteed resolved; throws otherwise so a premature
// read surfaces loudly instead of silently reading from an empty cache.
export function useSelectedSlug(): string {
  const { selectedSlug } = useAppState();
  if (selectedSlug === null) {
    throw new Error('useSelectedSlug called before the slug was resolved');
  }
  return selectedSlug;
}

export function useCacheRefresh(listener: CacheRefreshListener): void {
  const { subscribeToCacheRefresh, getRefreshEpoch } = useAppContext();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  // Epoch this subscriber has already reacted to. Starts at 0 so a refresh that
  // fired before mount (current epoch > 0) is caught up on subscribe.
  const seenEpochRef = useRef(0);

  useEffect(() => {
    if (getRefreshEpoch() !== seenEpochRef.current) {
      seenEpochRef.current = getRefreshEpoch();
      listenerRef.current();
    }
    return subscribeToCacheRefresh(() => {
      seenEpochRef.current = getRefreshEpoch();
      listenerRef.current();
    });
  }, [subscribeToCacheRefresh, getRefreshEpoch]);
}
