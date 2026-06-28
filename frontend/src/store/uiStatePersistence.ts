import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrateInterests } from '../cache/cacheService';

// ─────────────────────────────────────────────────────────────────────────────
// Single owner of all persisted timeline UI state. Holds an in-memory snapshot
// (always read synchronously and kept current) and persists changes to
// AsyncStorage with a short internal debounce that coalesces bursts (e.g. the
// drag-end + momentum-end pair at the end of a scroll) into one write.
//
// AsyncStorage is used on every platform (localStorage on web, native store on
// iOS/Android), so the UI-restore pattern is identical everywhere. The snapshot
// updates synchronously on every set, so restore reads are never stale even
// while a write is still pending.
// ─────────────────────────────────────────────────────────────────────────────

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_HIDDEN_CATS    = 'timeline:hiddenCategories';   // existing — JSON string[]
const KEY_SCROLL_POS     = 'timeline:scrollPositions:v2'; // existing — Record<screenKey, Record<dayStart, x>>
const KEY_SELECTED_DAY   = 'timeline:selectedDayStart';   // new      — Record<screenKey, dayStart>

const WRITE_DEBOUNCE_MS = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScrollPositions = Record<string, Record<string, number>>; // screenKey → dayStart → x
export type SelectedDayMap  = Record<string, number>;                  // screenKey → dayStart

type Snapshot = {
  hiddenCategories: string[];
  scrollPositions: ScrollPositions;
  selectedDayStart: SelectedDayMap;
};

export type UiStateKey = keyof Snapshot;

type Entry<K extends UiStateKey> = {
  storageKey: string;
  parse: (raw: string) => Snapshot[K];
  serialize: (value: Snapshot[K]) => string;
  fallback: () => Snapshot[K];
};

const ENTRIES: { [K in UiStateKey]: Entry<K> } = {
  hiddenCategories: {
    storageKey: KEY_HIDDEN_CATS,
    parse: (raw) => JSON.parse(raw) as string[],
    serialize: (value) => JSON.stringify(value),
    fallback: () => [],
  },
  scrollPositions: {
    storageKey: KEY_SCROLL_POS,
    parse: (raw) => JSON.parse(raw) as ScrollPositions,
    serialize: (value) => JSON.stringify(value),
    fallback: () => ({}),
  },
  selectedDayStart: {
    storageKey: KEY_SELECTED_DAY,
    parse: (raw) => JSON.parse(raw) as SelectedDayMap,
    serialize: (value) => JSON.stringify(value),
    fallback: () => ({}),
  },
};

const KEYS = Object.keys(ENTRIES) as UiStateKey[];

// ── In-memory snapshot ──────────────────────────────────────────────────────

let snapshot: Snapshot = {
  hiddenCategories: ENTRIES.hiddenCategories.fallback(),
  scrollPositions: ENTRIES.scrollPositions.fallback(),
  selectedDayStart: ENTRIES.selectedDayStart.fallback(),
};

// ── Hydration ────────────────────────────────────────────────────────────────

async function hydrateUiState(): Promise<void> {
  for (const key of KEYS) {
    const raw = await AsyncStorage.getItem(ENTRIES[key].storageKey).catch(() => null);
    if (raw === null) {
      continue;
    }
    try {
      const parsed = ENTRIES[key].parse(raw);
      snapshot = { ...snapshot, [key]: parsed } as Snapshot;
    } catch {
      // Corrupt value — keep the fallback already in the snapshot.
    }
  }
}

/**
 * Load all local persisted state (UI-state snapshot + local interests for the
 * slug) before the splash lifts. Never rejects — storage errors fall back to
 * defaults so startup is never blocked.
 */
export async function hydrateLocalState(slug: string): Promise<void> {
  await Promise.all([
    hydrateUiState().catch(() => undefined),
    hydrateInterests(slug).catch(() => undefined),
  ]);
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function getUiState<K extends UiStateKey>(key: K): Snapshot[K] {
  return snapshot[key];
}

// ── Writes (snapshot sync, storage debounced) ────────────────────────────────

const dirty = new Set<UiStateKey>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function flushDirty(): void {
  dirty.forEach((key) => {
    // key is a union here; serialize/value share the same K at runtime but TS
    // widens to the intersection, so read through a loosened view.
    const entry = ENTRIES[key] as Entry<UiStateKey> & { serialize: (value: unknown) => string };
    void AsyncStorage.setItem(entry.storageKey, entry.serialize(snapshot[key])).catch(() => undefined);
  });
  dirty.clear();
}

function scheduleWrite(): void {
  if (writeTimer !== null) {
    return;
  }
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushDirty();
  }, WRITE_DEBOUNCE_MS);
}

function setUiState<K extends UiStateKey>(key: K, value: Snapshot[K]): void {
  snapshot = { ...snapshot, [key]: value } as Snapshot;
  dirty.add(key);
  scheduleWrite();
}

// ── Public mutators (the only way components write UI state) ──────────────────

export function setHiddenCategories(list: string[]): void {
  setUiState('hiddenCategories', list);
}

export function setSelectedDay(screenKey: string, dayStart: number): void {
  setUiState('selectedDayStart', { ...snapshot.selectedDayStart, [screenKey]: dayStart });
}

export function getSelectedDay(screenKey: string): number | undefined {
  return snapshot.selectedDayStart[screenKey];
}

export function setScroll(screenKey: string, dayStart: number, x: number): void {
  const forScreen = { ...(snapshot.scrollPositions[screenKey] ?? {}), [String(dayStart)]: x };
  setUiState('scrollPositions', { ...snapshot.scrollPositions, [screenKey]: forScreen });
}

export function getScroll(screenKey: string, dayStart: number): number | undefined {
  return snapshot.scrollPositions[screenKey]?.[String(dayStart)];
}
