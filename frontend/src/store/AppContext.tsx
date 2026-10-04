import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState = {
  // null until the persisted slug has been read from AsyncStorage on startup;
  // thereafter always a real slug. This is the single source of truth for
  // "is the slug known yet" — StartupGate holds the first sync until it resolves.
  selectedSlug: string | null;
  isLoading: boolean;
  lastError: string | null;
};

// The sync watermark deliberately does NOT live here. It belongs to the data it
// describes, so cacheService owns it and persists it alongside the datasets —
// keeping it in React state also meant a re-render of every context consumer on
// each poll, for a value nothing rendered.
type AppAction =
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null };

// Cache-change notification deliberately does NOT live here. It belongs to the
// cache it describes, so cacheService owns the version and the listener set and
// components read it through store/cacheStore's hooks. Keeping it here made
// subscribing optional, and most readers never did.
type AppContextValue = {
  state: AppState;
  setSelectedSlug: (slug: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_SLUG = 'app:selectedSlug';
// TODO: Change the default slug automatically for the first installation to be
// the next year when we e.g. one month after BA ended.
// Test builds override this through their EAS profile: the fixtures cover
// ba2025, and the real default is the next festival, which has no captured data
// — an E2E or perf run would otherwise boot into an empty, entirely healthy app.
// Written as a static member expression on purpose: that is the only form
// Expo's Babel plugin inlines at build time.
const DEFAULT_SLUG = process.env.EXPO_PUBLIC_DEFAULT_SLUG ?? 'ba2027';

// ── Reducer ───────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SLUG':
      return { ...state, selectedSlug: action.slug };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, lastError: action.error };
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
  });

  // Resolve selectedSlug from AsyncStorage on mount. Always dispatches a real
  // slug — falling back to DEFAULT_SLUG on a missing value or a read error — so
  // the slug can never stay null and deadlock StartupGate's first-sync gate.
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

  const value = useMemo<AppContextValue>(
    () => ({ state, setSelectedSlug, setLoading, setError }),
    [state, setSelectedSlug, setLoading, setError],
  );

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

// Returns the resolved slug. Safe to call anywhere below StartupGate's loading
// gate, where the slug is guaranteed resolved; throws otherwise so a premature
// read surfaces loudly instead of silently reading from an empty cache.
export function useSelectedSlug(): string {
  const { selectedSlug } = useAppState();
  if (selectedSlug === null) {
    throw new Error('useSelectedSlug called before the slug was resolved');
  }
  return selectedSlug;
}

// useCacheRefresh is gone: read cached data with the hooks in store/cacheStore,
// which subscribe for you. The epoch latch this hook needed — to catch a refresh
// that fired before a late subscriber mounted — is unnecessary there, because
// useSyncExternalStore reads the current snapshot during render.
