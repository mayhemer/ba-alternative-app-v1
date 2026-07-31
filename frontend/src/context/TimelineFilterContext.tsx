import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getUiState, setHiddenCategories as persistHiddenCategories } from '../store/uiStatePersistence';
import { currentTimeMs } from '../utils/clock';

// Provider lives above AppShell so that slot components rendered in TopBar/BottomBar
// can access the context even though they're outside the navigator tree.
//
// Persisted UI state (hidden categories, scroll positions, selected day) is owned
// by the uiStatePersistence module, hydrated before this provider mounts (under
// StartupGate). Scroll positions and the per-screen selected day are read/written
// directly against that module by the timeline screens; only hiddenCategories
// needs to live here as React state because hiding a category re-renders the lanes.

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScrollToTimeSignal = {
  screenKey: string;
  fromMs: number;
  toMs: number;
  /** Lane to centre vertically; undefined leaves the vertical offset alone. */
  categoryId?: string;
  counter: number;
};

type TimelineFilterContextValue = {
  // Available festival days (Unix ms of each day's 06:00).
  // Set by TimelineScreen when it loads events; [] until then.
  festivalDays: number[];
  setFestivalDays: (days: number[]) => void;

  // Currently displayed day (0 = not yet initialised).
  selectedDayStart: number;
  setSelectedDayStart: (ts: number) => void;

  // Category IDs the user has chosen to hide. Persisted.
  hiddenCategories: Set<string>;
  toggleCategory: (categoryId: string) => void;

  // Signals a specific screen's TimelineView to scroll to an event: its centre is
  // centred in the view, but the start is kept visible with 1 h of space to its left.
  // categoryId, when given, also centres that category's lane vertically; the
  // "now" button omits it, since jumping to the current time should not move the
  // lane the user is looking at.
  scrollToTimeSignal: ScrollToTimeSignal;
  requestScrollToTime: (screenKey: string, fromMs: number, toMs: number, categoryId?: string) => void;

  // Convenience wrapper: scroll so the current time is centred.
  requestScrollToNow: (screenKey: string) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(null);

export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const [festivalDays,    setFestivalDays]    = useState<number[]>([]);
  const [selectedDayStart, setSelectedDayStart] = useState<number>(0);
  // Seeded synchronously from the already-hydrated snapshot (StartupGate gates
  // this provider behind hydration).
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(getUiState('hiddenCategories')),
  );
  const [scrollToTimeSignal, setScrollToTimeSignal] = useState<ScrollToTimeSignal>({ screenKey: '', fromMs: 0, toMs: 0, counter: 0 });

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const toggleCategory = useCallback((categoryId: string): void => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      persistHiddenCategories(Array.from(next));
      return next;
    });
  }, []);

  const requestScrollToTime = useCallback((screenKey: string, fromMs: number, toMs: number, categoryId?: string): void => {
    setScrollToTimeSignal((prev) => ({ screenKey, fromMs, toMs, categoryId, counter: prev.counter + 1 }));
  }, []);

  const requestScrollToNow = useCallback((screenKey: string): void => {
    const now = currentTimeMs();
    requestScrollToTime(screenKey, now, now);
  }, [requestScrollToTime]);

  const value = useMemo(
    () => ({
      festivalDays,
      setFestivalDays,
      selectedDayStart,
      setSelectedDayStart,
      hiddenCategories,
      toggleCategory,
      scrollToTimeSignal,
      requestScrollToTime,
      requestScrollToNow,
    }),
    // useState setters (setFestivalDays, setSelectedDayStart) are stable — omitted
    [festivalDays, selectedDayStart, hiddenCategories, toggleCategory, scrollToTimeSignal, requestScrollToTime, requestScrollToNow],
  );

  return (
    <TimelineFilterContext.Provider value={value}>
      {children}
    </TimelineFilterContext.Provider>
  );
}

export function useTimelineFilter(): TimelineFilterContextValue {
  const ctx = useContext(TimelineFilterContext);
  if (ctx === null) {
    throw new Error('useTimelineFilter must be used inside TimelineFilterProvider');
  }
  return ctx;
}
