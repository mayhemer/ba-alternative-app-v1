import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedbackVariant = 'progress' | 'confirmation' | 'warning';

export type FeedbackMessage = {
  text: string;
  variant: FeedbackVariant;
  error?: unknown; // stored on warn() — reserved for future tap-for-detail
};

export type FeedbackTracker = {
  /** Replace spinner with ✓ tick; auto-dismiss after 2 s or on tap. */
  confirm(): void;
  /** Replace spinner with ⚠ icon; stays until tap. Stores error for future detail. */
  warn(error?: unknown): void;
  /** Convenience: awaits promise, calls confirm() on resolve, warn(err) on reject. */
  wrap<T>(promise: Promise<T>): Promise<T | null>;
};

// Slot components are module-level React components that read their own
// contexts directly — no props needed. Using ComponentType (not ReactNode)
// gives stable references so useFocusEffect deps don't fire on every render.
export type TopBarConfig = {
  title: string;
  LeftComponent?: React.ComponentType;
  RightComponent?: React.ComponentType;
};

export type BottomBarConfig = {
  ContentComponent?: React.ComponentType;
};

type ScreenUIState = {
  topBar: TopBarConfig;
  bottomBar: BottomBarConfig;
  feedback: FeedbackMessage | null;
};

type ScreenUIAction =
  | { type: 'SET_TOPBAR'; config: TopBarConfig }
  | { type: 'SET_BOTTOMBAR'; config: BottomBarConfig }
  | { type: 'SET_FEEDBACK'; message: FeedbackMessage | null };

// Actions context is stable — never changes after mount.
// State context changes on every dispatch.
type ScreenUIActionsContextValue = {
  setTopBar: (config: TopBarConfig) => void;
  setBottomBar: (config: BottomBarConfig) => void;
  showFeedback: (text: string, variant?: FeedbackVariant, durationMs?: number) => void;
  startProgress: (text: string) => FeedbackTracker;
  dismissFeedback: () => void;
};

type ScreenUIStateContextValue = {
  state: ScreenUIState;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultState: ScreenUIState = {
  topBar: { title: '' },
  bottomBar: {},
  feedback: null,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function screenUIReducer(state: ScreenUIState, action: ScreenUIAction): ScreenUIState {
  switch (action.type) {
    case 'SET_TOPBAR':
      return { ...state, topBar: action.config };
    case 'SET_BOTTOMBAR':
      return { ...state, bottomBar: action.config };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.message };
  }
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const ScreenUIActionsContext = createContext<ScreenUIActionsContextValue | null>(null);
const ScreenUIStateContext = createContext<ScreenUIStateContextValue | null>(null);

export function ScreenUIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(screenUIReducer, defaultState);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracker identity — incremented on each startProgress call.
  // Stale trackers whose id no longer matches are silently ignored (last-one-wins).
  const trackerCounterRef = useRef<number>(0);
  const activeTrackerIdRef = useRef<number>(0);

  // Stable helper — only refs, no deps
  const clearDismissTimer = useCallback((): void => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const setTopBar = useCallback((config: TopBarConfig): void => {
    dispatch({ type: 'SET_TOPBAR', config });
  }, []);

  const setBottomBar = useCallback((config: BottomBarConfig): void => {
    dispatch({ type: 'SET_BOTTOMBAR', config });
  }, []);

  const dismissFeedback = useCallback((): void => {
    clearDismissTimer();
    activeTrackerIdRef.current = 0;
    dispatch({ type: 'SET_FEEDBACK', message: null });
  }, [clearDismissTimer]);

  const showFeedback = useCallback((
    text: string,
    variant: FeedbackVariant = 'confirmation',
    durationMs: number = 2500,
  ): void => {
    clearDismissTimer();
    activeTrackerIdRef.current = 0;
    dispatch({ type: 'SET_FEEDBACK', message: { text, variant } });
    if (durationMs > 0) {
      dismissTimerRef.current = setTimeout(() => {
        dispatch({ type: 'SET_FEEDBACK', message: null });
        dismissTimerRef.current = null;
      }, durationMs);
    }
  }, [clearDismissTimer]);

  const startProgress = useCallback((text: string): FeedbackTracker => {
    clearDismissTimer();

    trackerCounterRef.current += 1;
    const trackerId = trackerCounterRef.current;
    activeTrackerIdRef.current = trackerId;

    dispatch({ type: 'SET_FEEDBACK', message: { text, variant: 'progress' } });

    function confirm(): void {
      if (activeTrackerIdRef.current !== trackerId) { return; }
      dispatch({ type: 'SET_FEEDBACK', message: { text, variant: 'confirmation' } });
      dismissTimerRef.current = setTimeout(() => {
        if (activeTrackerIdRef.current === trackerId) {
          dispatch({ type: 'SET_FEEDBACK', message: null });
          activeTrackerIdRef.current = 0;
        }
        dismissTimerRef.current = null;
      }, 2500);
    }

    function warn(error?: unknown): void {
      if (activeTrackerIdRef.current !== trackerId) { return; }
      dispatch({ type: 'SET_FEEDBACK', message: { text, variant: 'warning', error } });
    }

    async function wrap<T>(promise: Promise<T>): Promise<T | null> {
      try {
        const result = await promise;
        confirm();
        return result;
      } catch (err) {
        warn(err);
        return null;
      }
    }

    return { confirm, warn, wrap };
  }, [clearDismissTimer]);

  const actionsValue = useMemo(
    () => ({ setTopBar, setBottomBar, showFeedback, startProgress, dismissFeedback }),
    [setTopBar, setBottomBar, showFeedback, startProgress, dismissFeedback],
  );

  const stateValue = useMemo(() => ({ state }), [state]);

  return (
    <ScreenUIActionsContext.Provider value={actionsValue}>
      <ScreenUIStateContext.Provider value={stateValue}>
        {children}
      </ScreenUIStateContext.Provider>
    </ScreenUIActionsContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useScreenUIActions(): ScreenUIActionsContextValue {
  const ctx = useContext(ScreenUIActionsContext);
  if (ctx === null) {
    throw new Error('useScreenUIActions must be used inside ScreenUIProvider');
  }
  return ctx;
}

function useScreenUIState(): ScreenUIStateContextValue {
  const ctx = useContext(ScreenUIStateContext);
  if (ctx === null) {
    throw new Error('useScreenUIState must be used inside ScreenUIProvider');
  }
  return ctx;
}

// Full access — subscribes to both contexts. Use only in components that
// need to render state (TopBar, BottomBar, FeedbackToast).
export function useScreenUI() {
  const { state } = useScreenUIState();
  const actions = useScreenUIActions();
  return { state, ...actions };
}

export function useFeedback(): (text: string, variant?: FeedbackVariant) => void {
  const { showFeedback } = useScreenUIActions();
  return showFeedback;
}

// Subscribes only to the stable actions context — never re-renders due to
// feedback/topBar/bottomBar state changes.
export function useStartProgress(): (text: string) => FeedbackTracker {
  const { startProgress } = useScreenUIActions();
  return startProgress;
}

/**
 * Register TopBar controls for the current screen.
 * Pass module-level ComponentType references (not inline components) so the
 * ref stays stable and useFocusEffect does not re-fire on every render.
 */
export function useTopBar(config: TopBarConfig): void {
  const { setTopBar } = useScreenUIActions();
  // configRef holds the latest config without being a dep of the callback,
  // so useFocusEffect fires only on focus/blur, not on every config change.
  const configRef = useRef(config);
  configRef.current = config;

  useFocusEffect(
    useCallback(() => {
      setTopBar(configRef.current);
    }, [setTopBar]),
  );
}

/**
 * Register BottomBar content for the current screen.
 */
export function useBottomBar(config: BottomBarConfig): void {
  const { setBottomBar } = useScreenUIActions();
  const configRef = useRef(config);
  configRef.current = config;

  useFocusEffect(
    useCallback(() => {
      setBottomBar(configRef.current);
    }, [setBottomBar]),
  );
}
