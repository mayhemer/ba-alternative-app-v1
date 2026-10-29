import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useSelectedSlug } from '../../store/AppContext';
import { useFestivalDays } from '../../store/cacheStore';
import { getSelectedDay, getUiState, setHiddenCategories as persistHiddenCategories } from '../../store/uiStatePersistence';
import { getFestivalDayStart } from '../../utils/festivalTime';
import { currentTimeMs } from '../../utils/clock';

// Provider lives above AppShell so that slot components rendered in TopBar/BottomBar
// can access the context even though they're outside the navigator tree.
//
// Persisted UI state (hidden categories, scroll positions, selected day) is owned
// by the uiStatePersistence module, hydrated before this provider mounts (under
// StartupGate). Scroll positions and the per-screen selected day are read/written
// directly against that module by the timeline screens; only hiddenCategories
// needs to live here as React state because hiding a category re-renders the lanes.
//
// The festival days are derived here from the cache rather than handed in by a
// screen, and the selected day lives in a small store beside the context instead
// of in its value. Both used to be copied in by the timeline screen's mount
// effect, which changed this context's value straight after every mount — a
// second commit of the screen and of every other consumer, for a day the screen
// was already showing. Now mounting a timeline changes nothing a consumer reads:
// readers of the day subscribe to the day *they* show (useShownDay), which the
// screen sharing it does not change.

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
  // Available festival days (Unix ms of each day's 06:00) of the selected
  // edition, straight from the cache; [] while it has no schedule.
  festivalDays: number[];

  // Picks the day the timeline screens show. Read it back with useShownDay (the
  // day a screen shows) or useSelectedDay (the shared selection itself).
  setSelectedDayStart: (ts: number) => void;

  // Shares the day a timeline screen opened on with the day switcher, the back
  // history and the other timeline screen. A no-op once a day is selected, so it
  // can never override a day the user picked.
  shareOpeningDay: (ts: number) => void;

  // Category IDs the user has chosen to hide. Persisted.
  hiddenCategories: Set<string>;
  toggleCategory: (categoryId: string) => void;

  // Signals a specific screen's TimelineView to scroll to an event: its centre is
  // centred in the view, but the start is kept visible with 15 min of space to its left
  // (timelineLayout.eventScrollTarget).
  // categoryId, when given, also centres that category's lane vertically; the
  // "now" button omits it, since jumping to the current time should not move the
  // lane the user is looking at.
  scrollToTimeSignal: ScrollToTimeSignal;
  requestScrollToTime: (screenKey: string, fromMs: number, toMs: number, categoryId?: string) => void;

  // Convenience wrapper: scroll so the current time is centred.
  requestScrollToNow: (screenKey: string) => void;
};

// ── Selected day ──────────────────────────────────────────────────────────────

/** The shared selected day: Unix ms of its 06:00, 0 = nothing selected yet. */
type DayStore = {
  get: () => number;
  set: (day: number) => void;
  subscribe: (listener: () => void) => () => void;
};

function createDayStore(): DayStore {
  let day = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => day,
    set: (next) => {
      if (next === day) {
        return;
      }
      day = next;
      listeners.forEach((listener) => { listener(); });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/**
 * The day a screen opens on when the shared selection is not one of this
 * edition's days (nothing chosen yet, or a stale one): the screen's own
 * remembered day if still valid, else today if it is a festival day, else the
 * first day. 0 while the edition has no days at all.
 */
function openingDay(screenKey: string, days: number[]): number {
  if (days.length === 0) {
    return 0;
  }
  const persisted = getSelectedDay(screenKey);
  if (persisted !== undefined && days.includes(persisted)) {
    return persisted;
  }
  const today = getFestivalDayStart(currentTimeMs());
  return days.find((d) => d === today) ?? days[0];
}

// ── Context ───────────────────────────────────────────────────────────────────

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(null);
const DayStoreContext = createContext<DayStore | null>(null);

export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const festivalDays = useFestivalDays(useSelectedSlug());
  const [dayStore] = useState(createDayStore);
  // Seeded synchronously from the already-hydrated snapshot (StartupGate gates
  // this provider behind hydration).
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(getUiState('hiddenCategories')),
  );
  const [scrollToTimeSignal, setScrollToTimeSignal] = useState<ScrollToTimeSignal>({ screenKey: '', fromMs: 0, toMs: 0, counter: 0 });

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const setSelectedDayStart = useCallback((ts: number): void => {
    dayStore.set(ts);
  }, [dayStore]);

  // Reads the selection at call time, not from a render: a day the user picked
  // after the screen rendered must not be replaced by the one it opened on.
  const shareOpeningDay = useCallback((ts: number): void => {
    if (ts !== 0 && !festivalDays.includes(dayStore.get())) {
      dayStore.set(ts);
    }
  }, [dayStore, festivalDays]);

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
      setSelectedDayStart,
      shareOpeningDay,
      hiddenCategories,
      toggleCategory,
      scrollToTimeSignal,
      requestScrollToTime,
      requestScrollToNow,
    }),
    [festivalDays, setSelectedDayStart, shareOpeningDay, hiddenCategories, toggleCategory, scrollToTimeSignal, requestScrollToTime, requestScrollToNow],
  );

  return (
    <DayStoreContext.Provider value={dayStore}>
      <TimelineFilterContext.Provider value={value}>
        {children}
      </TimelineFilterContext.Provider>
    </DayStoreContext.Provider>
  );
}

export function useTimelineFilter(): TimelineFilterContextValue {
  const ctx = useContext(TimelineFilterContext);
  if (ctx === null) {
    throw new Error('useTimelineFilter must be used inside TimelineFilterProvider');
  }
  return ctx;
}

function useDayStore(): DayStore {
  const store = useContext(DayStoreContext);
  if (store === null) {
    throw new Error('useDayStore must be used inside TimelineFilterProvider');
  }
  return store;
}

/**
 * The shared selected day as it stands: 0 until a timeline screen has opened or
 * the user has picked one. For readers that are not a timeline screen.
 */
export function useSelectedDay(): number {
  const store = useDayStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * The day the timeline screen `screenKey` shows: the shared selection when it is
 * one of this edition's days, else the screen's opening day. 0 only while the
 * edition has no days.
 *
 * Derived during render, so a screen paints its day on the very first frame,
 * and subscribed to the derived value rather than to the selection: the screen
 * sharing its opening day (shareOpeningDay) leaves this unchanged, so it
 * re-renders nothing.
 */
export function useShownDay(screenKey: string): number {
  const store = useDayStore();
  const { festivalDays } = useTimelineFilter();
  const getShownDay = useCallback((): number => {
    const selected = store.get();
    if (festivalDays.includes(selected)) {
      return selected;
    }
    return openingDay(screenKey, festivalDays);
  }, [store, festivalDays, screenKey]);
  return useSyncExternalStore(store.subscribe, getShownDay, getShownDay);
}
