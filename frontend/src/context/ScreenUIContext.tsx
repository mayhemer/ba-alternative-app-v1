import React, { createContext, useContext, useReducer } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TopBarConfig = {
  title: string;
  // Per-screen right/left action slots — populated when each screen is built
  rightContent?: React.ReactNode;
  leftContent?: React.ReactNode;
};

export type BottomBarConfig = {
  content?: React.ReactNode;
};

type ScreenUIState = {
  topBar: TopBarConfig;
  bottomBar: BottomBarConfig;
};

type ScreenUIAction =
  | { type: 'SET_TOPBAR'; config: TopBarConfig }
  | { type: 'SET_BOTTOMBAR'; config: BottomBarConfig };

type ScreenUIContextValue = {
  state: ScreenUIState;
  setTopBar: (config: TopBarConfig) => void;
  setBottomBar: (config: BottomBarConfig) => void;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultState: ScreenUIState = {
  topBar: { title: '' },
  bottomBar: {},
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function screenUIReducer(state: ScreenUIState, action: ScreenUIAction): ScreenUIState {
  switch (action.type) {
    case 'SET_TOPBAR':
      return { ...state, topBar: action.config };
    case 'SET_BOTTOMBAR':
      return { ...state, bottomBar: action.config };
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const ScreenUIContext = createContext<ScreenUIContextValue | null>(null);

export function ScreenUIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(screenUIReducer, defaultState);

  function setTopBar(config: TopBarConfig): void {
    dispatch({ type: 'SET_TOPBAR', config });
  }

  function setBottomBar(config: BottomBarConfig): void {
    dispatch({ type: 'SET_BOTTOMBAR', config });
  }

  return (
    <ScreenUIContext.Provider value={{ state, setTopBar, setBottomBar }}>
      {children}
    </ScreenUIContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useScreenUI(): ScreenUIContextValue {
  const ctx = useContext(ScreenUIContext);
  if (ctx === null) {
    throw new Error('useScreenUI must be used inside ScreenUIProvider');
  }
  return ctx;
}

/**
 * Register TopBar controls for the current screen.
 * Only active while the screen is focused.
 */
export function useTopBar(config: TopBarConfig): void {
  const { setTopBar } = useScreenUI();
  useFocusEffect(
    React.useCallback(() => {
      setTopBar(config);
      // No cleanup needed — next focused screen will overwrite
    }, [JSON.stringify(config)]), // eslint-disable-line react-hooks/exhaustive-deps
  );
}

/**
 * Register BottomBar content for the current screen.
 * Only active while the screen is focused.
 */
export function useBottomBar(config: BottomBarConfig): void {
  const { setBottomBar } = useScreenUI();
  useFocusEffect(
    React.useCallback(() => {
      setBottomBar(config);
    }, [JSON.stringify(config)]), // eslint-disable-line react-hooks/exhaustive-deps
  );
}
