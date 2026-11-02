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
import { useFocusEffect } from '@react-navigation/native';
import { useExclusiveOverlay } from '../../hooks/useExclusiveOverlay';
import type { SearchScope } from './searchScope';

// ── Search's shared state ─────────────────────────────────────────────────────
//
// Two parts, so each reader re-renders only for what it reads:
//
//   - whether the search is open: in the screen-exclusivity hub with the drawer
//     and the two panels, so opening the drawer or a panel closes it, and
//     opening it closes them (the panel it was opened from included);
//   - the focused screen's scope (searchScope.ts), registered while the screen
//     is focused (useSearchScope). A store, not state: a lens or filter change
//     re-registers it without rendering the shell; only an open search reads it.
//
// The query lives in SearchView itself, so typing renders nothing else.

type SearchOpenValue = { isOpen: boolean; open: () => void; close: () => void };

type ScopeStore = {
  get: () => SearchScope | null;
  set: (owner: object, scope: SearchScope) => void;
  clear: (owner: object) => void;
  subscribe: (listener: () => void) => () => void;
};

function createScopeStore(): ScopeStore {
  let current: { owner: object; scope: SearchScope } | null = null;
  const listeners = new Set<() => void>();
  const changed = (): void => { listeners.forEach((listener) => { listener(); }); };
  return {
    get: () => current?.scope ?? null,
    set: (owner, scope) => {
      if (current !== null && current.owner === owner && current.scope === scope) {
        return;
      }
      current = { owner, scope };
      changed();
    },
    clear: (owner) => {
      if (current?.owner === owner) {
        current = null;
        changed();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

const SearchOpenContext = createContext<SearchOpenValue | null>(null);
const ScopeStoreContext = createContext<ScopeStore | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [store] = useState(createScopeStore);

  const open = useCallback((): void => { setIsOpen(true); }, []);
  const close = useCallback((): void => { setIsOpen(false); }, []);

  // Announced from the open state, as the panels do, so every way of opening
  // closes the other overlays.
  const notifyOpening = useExclusiveOverlay(close);
  useEffect(() => {
    if (isOpen) { notifyOpening(); }
  }, [isOpen, notifyOpening]);

  const openValue = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <ScopeStoreContext.Provider value={store}>
      <SearchOpenContext.Provider value={openValue}>
        {children}
      </SearchOpenContext.Provider>
    </ScopeStoreContext.Provider>
  );
}

export function useSearch(): SearchOpenValue {
  const ctx = useContext(SearchOpenContext);
  if (ctx === null) {
    throw new Error('useSearch must be used inside SearchProvider');
  }
  return ctx;
}

function useScopeStore(): ScopeStore {
  const store = useContext(ScopeStoreContext);
  if (store === null) {
    throw new Error('useSearchScope must be used inside SearchProvider');
  }
  return store;
}

/**
 * Tells search what the screen shows, while it is focused. Leaving the screen
 * closes the search: a search belongs to the screen it was opened on.
 */
export function useSearchScope(scope: SearchScope): void {
  const store = useScopeStore();
  const { close } = useSearch();
  const ownerRef = useRef({});
  const focusedRef = useRef(false);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useFocusEffect(
    useCallback(() => {
      const owner = ownerRef.current;
      focusedRef.current = true;
      store.set(owner, scopeRef.current);
      return () => {
        focusedRef.current = false;
        store.clear(owner);
        close();
      };
    }, [store, close]),
  );

  // A new scope (the lens, a pick, the filter) while focused replaces the old.
  useEffect(() => {
    if (focusedRef.current) {
      store.set(ownerRef.current, scope);
    }
  }, [store, scope]);
}

/** The focused screen's scope; null where no screen offers search. */
export function useCurrentSearchScope(): SearchScope | null {
  const store = useScopeStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
