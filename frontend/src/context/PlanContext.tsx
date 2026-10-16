import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useExclusiveOverlay } from '../hooks/useExclusiveOverlay';
import { getUiState, setPlanFilters, type PlanFilters } from '../store/uiStatePersistence';
import { defaultPlanDay } from '../utils/planUtils';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';

// ── My plan's shared state ────────────────────────────────────────────────────
//
// Lives above AppShell, like the lens: the filter chip sits in the TopBar, the
// day switcher in the BottomBar and the now pill in every screen's TopBar, all
// outside the navigator's tree. Three parts, so each consumer re-renders only
// for what it reads:
//
//   - filters (persisted): Show Maybe picks, Show only conflicts;
//   - the filter panel's open state, in the screen-exclusivity hub with the
//     drawer and the lens panel;
//   - a small store for the shown day and "go to now" requests.
//
// The shown day is derived during render, never seeded by an effect: a day the
// user picked counts only while the festival day it was picked on is still
// today, so a cold start (the store is in memory) and the 06:00 day change both
// fall back to today with nothing to reset.

// ── Day and "now" store ───────────────────────────────────────────────────────

type DaySelection = { day: number; pickedOnDay: number };

type PlanStore = {
  getSelection: () => DaySelection | null;
  /** Bumped on every change, for subscribers. */
  getVersion: () => number;
  pickDay: (day: number, now: number) => void;
  /** Today, scrolled to now: clears the picked day and asks the screen to scroll. */
  requestNow: () => void;
  /** Takes a pending "scroll to now" request; true once per request. */
  takeNowRequest: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

function createPlanStore(): PlanStore {
  let selection: DaySelection | null = null;
  let nowPending = false;
  let version = 0;
  const listeners = new Set<() => void>();
  const changed = (): void => {
    version += 1;
    listeners.forEach((listener) => { listener(); });
  };
  return {
    getSelection: () => selection,
    getVersion: () => version,
    pickDay: (day, now) => {
      selection = { day, pickedOnDay: getFestivalDayStart(now) };
      changed();
    },
    requestNow: () => {
      selection = null;
      nowPending = true;
      changed();
    },
    takeNowRequest: () => {
      const pending = nowPending;
      nowPending = false;
      return pending;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** The day My plan shows, derived from the store, the festival days and now. */
export function shownPlanDay(selection: DaySelection | null, festivalDays: number[], now: number): number {
  if (
    selection !== null
    && selection.pickedOnDay === getFestivalDayStart(now)
    && festivalDays.includes(selection.day)
  ) {
    return selection.day;
  }
  return defaultPlanDay(festivalDays, now);
}

// ── Contexts ──────────────────────────────────────────────────────────────────

type PlanFilterContextValue = PlanFilters & {
  toggleMaybe: () => void;
  toggleConflictsOnly: () => void;
};

type PlanPanelContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const PlanFilterContext = createContext<PlanFilterContextValue | null>(null);
const PlanPanelContext = createContext<PlanPanelContextValue | null>(null);
const PlanStoreContext = createContext<PlanStore | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  // Starts from the filters StartupGate loaded with the rest of the UI state.
  const [filters, setFilters] = useState<PlanFilters>(() => getUiState('planFilters'));
  const [isOpen, setIsOpen] = useState(false);
  const [store] = useState(createPlanStore);

  // Written only when the user flips a switch: a default stored at startup
  // would be indistinguishable from a choice. (The write is idempotent, so a
  // double-invoked updater is harmless.)
  const toggleMaybe = useCallback((): void => {
    setFilters((prev) => {
      const next = { ...prev, showMaybe: !prev.showMaybe };
      setPlanFilters(next);
      return next;
    });
  }, []);
  const toggleConflictsOnly = useCallback((): void => {
    setFilters((prev) => {
      const next = { ...prev, conflictsOnly: !prev.conflictsOnly };
      setPlanFilters(next);
      return next;
    });
  }, []);

  const toggle = useCallback((): void => { setIsOpen((prev) => !prev); }, []);
  const close = useCallback((): void => { setIsOpen(false); }, []);

  // Screen exclusivity: closes when the drawer or the lens panel opens, and
  // announces itself whenever it becomes visible.
  const notifyOpening = useExclusiveOverlay(close);
  useEffect(() => {
    if (isOpen) { notifyOpening(); }
  }, [isOpen, notifyOpening]);

  const filterValue = useMemo(
    () => ({ ...filters, toggleMaybe, toggleConflictsOnly }),
    [filters, toggleMaybe, toggleConflictsOnly],
  );
  const panelValue = useMemo(() => ({ isOpen, toggle, close }), [isOpen, toggle, close]);

  return (
    <PlanStoreContext.Provider value={store}>
      <PlanFilterContext.Provider value={filterValue}>
        <PlanPanelContext.Provider value={panelValue}>
          {children}
        </PlanPanelContext.Provider>
      </PlanFilterContext.Provider>
    </PlanStoreContext.Provider>
  );
}

export function usePlanFilters(): PlanFilterContextValue {
  const ctx = useContext(PlanFilterContext);
  if (ctx === null) {
    throw new Error('usePlanFilters must be used inside PlanProvider');
  }
  return ctx;
}

export function usePlanPanel(): PlanPanelContextValue {
  const ctx = useContext(PlanPanelContext);
  if (ctx === null) {
    throw new Error('usePlanPanel must be used inside PlanProvider');
  }
  return ctx;
}

export function usePlanStore(): PlanStore {
  const store = useContext(PlanStoreContext);
  if (store === null) {
    throw new Error('usePlanStore must be used inside PlanProvider');
  }
  return store;
}

/** The day My plan shows; re-renders when the user picks a day or asks for now. */
export function usePlanShownDay(festivalDays: number[], now: number): number {
  const store = usePlanStore();
  const selection = useSyncExternalStore(store.subscribe, store.getSelection, store.getSelection);
  return shownPlanDay(selection, festivalDays, now);
}

/** Changes whenever the store does — the screen's cue to check for a "now" request. */
export function usePlanStoreVersion(): number {
  const store = usePlanStore();
  return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}
