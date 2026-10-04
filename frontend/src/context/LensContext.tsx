import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useExclusiveOverlay } from '../hooks/useExclusiveOverlay';
import type { LensScope } from '../utils/interestUtils';
import { getUiState, setLensScope } from '../store/uiStatePersistence';

// The "lens" is the global source+filter that the artist list and both timelines
// read from. It supersedes the old per-screen `interestFilter`.
//
// Panel open-state lives in a SEPARATE context so toggling the panel does not
// re-render the (expensive) timeline/list consumers that only read `scope`.

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
  // Starts from the scope StartupGate loaded with the rest of the UI state,
  // rather than hydrating in an effect. Hydrating late re-rendered every list
  // and timeline once more after their first paint — and, arriving after the
  // back history's first observation, was recorded as a move the user made.
  const [scope, setScopeState] = useState<LensScope>(() => getUiState('lensScope'));
  const [isOpen, setIsOpen] = useState(false);

  // Remembered for the next launch; a friend's scope is not (see setLensScope).
  useEffect(() => {
    setLensScope(scope);
  }, [scope]);

  const toggle = useCallback((): void => { setIsOpen((prev) => !prev); }, []);
  const close = useCallback((): void => { setIsOpen(false); }, []);

  // Screen exclusivity: the panel closes when another overlay opens, and
  // announces itself whenever it becomes visible. Driven off `isOpen` rather
  // than from `toggle` so every route to opening the panel is covered.
  const notifyOpening = useExclusiveOverlay(close);
  useEffect(() => {
    if (isOpen) { notifyOpening(); }
  }, [isOpen, notifyOpening]);

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
