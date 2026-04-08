import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InterestStatus } from './InterestContext';

// Provider lives above AppShell so that slot components rendered in TopBar/BottomBar
// can access the context even though they're outside the navigator tree.

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_INTEREST_FILTER = 'timeline:interestFilter';
const KEY_HIDDEN_CATS   = 'timeline:hiddenCategories';  // stored as JSON array
const KEY_SCROLL_POS    = 'timeline:scrollPositions:v2'; // stored as JSON Record<screenKey, Record<dayStart, x>>

// ── Types ─────────────────────────────────────────────────────────────────────

type TimelineFilterContextValue = {
  // Available festival days (Unix ms of each day's 06:00).
  // Set by TimelineScreen when it loads events; [] until then.
  festivalDays: number[];
  setFestivalDays: (days: number[]) => void;

  // Currently displayed day (0 = not yet initialised).
  selectedDayStart: number;
  setSelectedDayStart: (ts: number) => void;

  // Interest filter for timeline — same 3-state semantics as artist list. Persisted.
  interestFilter: InterestStatus | null;
  setInterestFilter: (f: InterestStatus | null) => void;

  // Category IDs the user has chosen to hide. Persisted.
  hiddenCategories: Set<string>;
  toggleCategory: (categoryId: string) => void;

  // Per-screen, per-day horizontal scroll position (canvas X). Persisted.
  // Outer key = screenKey (e.g. 'timeline', 'support'), inner key = String(dayStart).
  scrollPositions: Record<string, Record<string, number>>;
  setScrollPosition: (screenKey: string, dayStart: number, x: number) => void;

  // Signals a specific screen's TimelineView to scroll to now.
  scrollToNowSignal: { screenKey: string; counter: number };
  requestScrollToNow: (screenKey: string) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(null);

export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const [festivalDays,    setFestivalDays]    = useState<number[]>([]);
  const [selectedDayStart, setSelectedDayStart] = useState<number>(0);
  const [interestFilter, setInterestFilter] = useState<InterestStatus | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [scrollPositions, setScrollPositions] = useState<Record<string, Record<string, number>>>({});
  const [scrollToNowSignal, setScrollToNowSignal] = useState<{ screenKey: string; counter: number }>({ screenKey: '', counter: 0 });

  // ── Hydration (once on mount) ───────────────────────────────────────────────

  useEffect(() => {
    async function hydrate(): Promise<void> {
      const [interestStored, hiddenStored, scrollStored] = await Promise.all([
        AsyncStorage.getItem(KEY_INTEREST_FILTER),
        AsyncStorage.getItem(KEY_HIDDEN_CATS),
        AsyncStorage.getItem(KEY_SCROLL_POS),
      ]);
      if (interestStored !== null) {
        setInterestFilter(JSON.parse(interestStored) as InterestStatus | null);
      }
      if (hiddenStored !== null) {
        setHiddenCategories(new Set(JSON.parse(hiddenStored) as string[]));
      }
      if (scrollStored !== null) {
        setScrollPositions(JSON.parse(scrollStored) as Record<string, Record<string, number>>);
      }
    }
    void hydrate();
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    void AsyncStorage.setItem(KEY_INTEREST_FILTER, JSON.stringify(interestFilter));
  }, [interestFilter]);

  useEffect(() => {
    void AsyncStorage.setItem(KEY_HIDDEN_CATS, JSON.stringify(Array.from(hiddenCategories)));
  }, [hiddenCategories]);

  useEffect(() => {
    void AsyncStorage.setItem(KEY_SCROLL_POS, JSON.stringify(scrollPositions));
  }, [scrollPositions]);

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const toggleCategory = useCallback((categoryId: string): void => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const setScrollPosition = useCallback((screenKey: string, dayStart: number, x: number): void => {
    setScrollPositions((prev) => ({
      ...prev,
      [screenKey]: { ...(prev[screenKey] ?? {}), [String(dayStart)]: x },
    }));
  }, []);

  const requestScrollToNow = useCallback((screenKey: string): void => {
    setScrollToNowSignal((prev) => ({ screenKey, counter: prev.counter + 1 }));
  }, []);

  const value = useMemo(
    () => ({
      festivalDays,
      setFestivalDays,
      selectedDayStart,
      setSelectedDayStart,
      interestFilter,
      setInterestFilter,
      hiddenCategories,
      toggleCategory,
      scrollPositions,
      setScrollPosition,
      scrollToNowSignal,
      requestScrollToNow,
    }),
    // useState setters (setFestivalDays, setSelectedDayStart, setInterestFilter) are stable — omitted
    [festivalDays, selectedDayStart, interestFilter, hiddenCategories, toggleCategory, scrollPositions, setScrollPosition, scrollToNowSignal, requestScrollToNow],
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
