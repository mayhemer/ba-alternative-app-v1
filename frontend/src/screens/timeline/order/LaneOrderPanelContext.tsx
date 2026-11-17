import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DbArtist } from '../../../types/backend';

// ── Whether the order panel is open, and for which timeline ───────────────────
//
// A long press on a timeline opens its order panel (LaneOrderPanel, drawn by
// AppShell over the content). The screen only ever opens and closes it, so the
// actions sit in a context of their own that never changes: opening the panel
// re-renders the panel alone, not the timeline under it.
//
// Provided by TimelineFilterProvider, beside the lane order itself.

export type OpenLaneOrder = {
  /** The timeline whose order the panel shows and changes. */
  screenKey: string;
  /** Its filter (bands or the rest), which decides the lanes it lists. */
  filterArtist?: (artist: DbArtist) => boolean;
};

type Actions = {
  open: (screenKey: string, filterArtist?: (artist: DbArtist) => boolean) => void;
  close: () => void;
};

const StateContext = createContext<OpenLaneOrder | null | undefined>(undefined);
const ActionsContext = createContext<Actions | null>(null);

export function LaneOrderPanelProvider({ children }: { children: React.ReactNode }) {
  const [opened, setOpened] = useState<OpenLaneOrder | null>(null);

  const open = useCallback((screenKey: string, filterArtist?: (artist: DbArtist) => boolean): void => {
    setOpened({ screenKey, filterArtist });
  }, []);

  const close = useCallback((): void => {
    setOpened(null);
  }, []);

  const actions = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={opened}>
        {children}
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** The timeline whose order panel is open; null while it is closed. */
export function useOpenLaneOrder(): OpenLaneOrder | null {
  const opened = useContext(StateContext);
  if (opened === undefined) {
    throw new Error('useOpenLaneOrder must be used inside TimelineFilterProvider');
  }
  return opened;
}

/** Opens and closes the order panel; never changes. */
export function useLaneOrderPanel(): Actions {
  const actions = useContext(ActionsContext);
  if (actions === null) {
    throw new Error('useLaneOrderPanel must be used inside TimelineFilterProvider');
  }
  return actions;
}
