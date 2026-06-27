import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type LensScope, DEFAULT_SCOPE } from '../utils/interestUtils';

// The "lens" is the global source+filter that the artist list and both timelines
// read from. It supersedes the old per-screen `interestFilter`.
//
// Panel open-state lives in a SEPARATE context so toggling the panel does not
// re-render the (expensive) timeline/list consumers that only read `scope`.

const KEY_LENS_SCOPE = 'lens:scope';

type LensContextValue = {
  scope: LensScope;
  setScope: (scope: LensScope) => void;
};

type LensPanelContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const LensContext = createContext<LensContextValue | null>(null);
const LensPanelContext = createContext<LensPanelContextValue | null>(null);

export function LensProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeState] = useState<LensScope>(DEFAULT_SCOPE);
  const [isOpen, setIsOpen] = useState(false);

  // Hydrate once. A persisted friend scope is intentionally NOT restored — we
  // never launch the app "viewing a friend"; only the all/me filter persists.
  useEffect(() => {
    AsyncStorage.getItem(KEY_LENS_SCOPE).then((raw) => {
      if (raw === null) { return; }
      try {
        const stored = JSON.parse(raw) as LensScope;
        if (stored.kind === 'friend') { return; }
        setScopeState(stored);
      } catch {
        // ignore malformed value
      }
    });
  }, []);

  // Persist all/me scopes; skip friend scopes so they don't survive a relaunch.
  useEffect(() => {
    if (scope.kind === 'friend') { return; }
    void AsyncStorage.setItem(KEY_LENS_SCOPE, JSON.stringify(scope));
  }, [scope]);

  const toggle = useCallback((): void => { setIsOpen((prev) => !prev); }, []);
  const close = useCallback((): void => { setIsOpen(false); }, []);

  const scopeValue = useMemo(() => ({ scope, setScope: setScopeState }), [scope]);
  const panelValue = useMemo(() => ({ isOpen, toggle, close }), [isOpen, toggle, close]);

  return (
    <LensContext.Provider value={scopeValue}>
      <LensPanelContext.Provider value={panelValue}>
        {children}
      </LensPanelContext.Provider>
    </LensContext.Provider>
  );
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (ctx === null) {
    throw new Error('useLens must be used inside LensProvider');
  }
  return ctx;
}

export function useLensPanel(): LensPanelContextValue {
  const ctx = useContext(LensPanelContext);
  if (ctx === null) {
    throw new Error('useLensPanel must be used inside LensProvider');
  }
  return ctx;
}
