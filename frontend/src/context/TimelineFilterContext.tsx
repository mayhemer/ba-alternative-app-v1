import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Provider lives above AppShell so that slot components rendered in TopBar/BottomBar
// can access the context even though they're outside the navigator tree.

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_MY_SCHEDULE   = 'timeline:myScheduleOnly';
const KEY_HIDDEN_CATS   = 'timeline:hiddenCategories';  // stored as JSON array
const KEY_SCROLL_POS    = 'timeline:scrollPositions';   // stored as JSON Record<string,number>

// ── Types ─────────────────────────────────────────────────────────────────────

type TimelineFilterContextValue = {
  // Available festival days (Unix ms of each day's 06:00).
  // Set by TimelineScreen when it loads events; [] until then.
  festivalDays: number[];
  setFestivalDays: (days: number[]) => void;

  // Currently displayed day (0 = not yet initialised).
  selectedDayStart: number;
  setSelectedDayStart: (ts: number) => void;

  // "My schedule only" — hides artists with status 'none'. Persisted.
  myScheduleOnly: boolean;
  setMyScheduleOnly: (v: boolean) => void;

  // Category IDs the user has chosen to hide. Persisted.
  hiddenCategories: Set<string>;
  toggleCategory: (categoryId: string) => void;

  // Per-day horizontal scroll position (canvas X). Persisted.
  scrollPositions: Record<string, number>;  // key = String(dayStart)
  setScrollPosition: (dayStart: number, x: number) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(null);

export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const [festivalDays,    setFestivalDays]    = useState<number[]>([]);
  const [selectedDayStart, setSelectedDayStart] = useState<number>(0);
  const [myScheduleOnly,  setMyScheduleOnly]  = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});

  // ── Hydration (once on mount) ───────────────────────────────────────────────

  useEffect(() => {
    async function hydrate(): Promise<void> {
      const [myScheduleStored, hiddenStored, scrollStored] = await Promise.all([
        AsyncStorage.getItem(KEY_MY_SCHEDULE),
        AsyncStorage.getItem(KEY_HIDDEN_CATS),
        AsyncStorage.getItem(KEY_SCROLL_POS),
      ]);
      if (myScheduleStored !== null) {
        setMyScheduleOnly(JSON.parse(myScheduleStored) as boolean);
      }
      if (hiddenStored !== null) {
        setHiddenCategories(new Set(JSON.parse(hiddenStored) as string[]));
      }
      if (scrollStored !== null) {
        setScrollPositions(JSON.parse(scrollStored) as Record<string, number>);
      }
    }
    void hydrate();
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    void AsyncStorage.setItem(KEY_MY_SCHEDULE, JSON.stringify(myScheduleOnly));
  }, [myScheduleOnly]);

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

  const setScrollPosition = useCallback((dayStart: number, x: number): void => {
    setScrollPositions((prev) => ({ ...prev, [String(dayStart)]: x }));
  }, []);

  return (
    <TimelineFilterContext.Provider
      value={{
        festivalDays,
        setFestivalDays,
        selectedDayStart,
        setSelectedDayStart,
        myScheduleOnly,
        setMyScheduleOnly,
        hiddenCategories,
        toggleCategory,
        scrollPositions,
        setScrollPosition,
      }}
    >
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
