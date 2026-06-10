import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState = {
  selectedSlug: string;
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
    selectedSlug: DEFAULT_SLUG,
    isLoading: true,
    lastError: null,
    lastSyncTime: 0,
  });

  // Event emitter for cache refresh notifications
  const refreshListeners = useRef<Set<CacheRefreshListener>>(new Set());

  // Hydrate selectedSlug from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_SLUG).then((stored) => {
      if (stored !== null) {
        dispatch({ type: 'SET_SLUG', slug: stored });
      }
    });
  }, []);

  // Persist selectedSlug to AsyncStorage whenever it changes
  useEffect(() => {
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
    refreshListeners.current.forEach((listener) => listener());
  }, []);

  const value: AppContextValue = {
    state,
    setSelectedSlug,
    setLoading,
    setError,
    setSyncTime,
    subscribeToCacheRefresh,
    emitCacheRefresh,
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

export function useCacheRefresh(listener: CacheRefreshListener): void {
  const { subscribeToCacheRefresh } = useAppContext();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return subscribeToCacheRefresh(() => listenerRef.current());
  }, [subscribeToCacheRefresh]);
}
