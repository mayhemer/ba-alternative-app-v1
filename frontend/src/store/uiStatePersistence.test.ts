import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getScroll,
  getSelectedDay,
  getUiState,
  hydrateLocalState,
  setHiddenCategories,
  setLensScope,
  setScroll,
  setSelectedDay,
} from './uiStatePersistence';

// ── UI-state persistence ──────────────────────────────────────────────────────
//
// The snapshot is module state with fixed keys, so cases isolate by screenKey
// rather than by resetting it — the same reason the caches key by slug.
//
// The contract has two halves that must not be confused: reads are synchronous
// against the in-memory snapshot, and writes are debounced. A restore that read
// through storage instead of the snapshot would be one frame behind, which is
// the class of bug the timeline scroll restore kept hitting.

const KEY_SCROLL = 'timeline:scrollPositions:v2';
const KEY_DAY = 'timeline:selectedDayStart';
const KEY_HIDDEN = 'timeline:hiddenCategories';
const KEY_LENS = 'lens:scope';
const DEBOUNCE_MS = 300;

const DAY = Date.parse('2026-08-05T00:00:00+02:00');

let screenCounter = 0;
const freshScreen = (): string => `screen${++screenCounter}`;

const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

// Lets the mocked storage promises settle while timers are faked.
const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ── Reads are synchronous ─────────────────────────────────────────────────────

describe('the in-memory snapshot', () => {
  it('reflects a write immediately, before it is persisted', () => {
    const screen = freshScreen();
    setScroll(screen, DAY, 1234);

    // No await, no timer advance: a restore running in the same tick must see it.
    expect(getScroll(screen, DAY)).toBe(1234);
  });

  it('keeps scroll positions separate per screen and per day', () => {
    const timeline = freshScreen();
    const support = freshScreen();
    setScroll(timeline, DAY, 100);
    setScroll(support, DAY, 200);
    setScroll(timeline, DAY + 86_400_000, 300);

    expect(getScroll(timeline, DAY)).toBe(100);
    expect(getScroll(support, DAY)).toBe(200);
    expect(getScroll(timeline, DAY + 86_400_000)).toBe(300);
  });

  it('keeps the selected day per screen', () => {
    const timeline = freshScreen();
    const support = freshScreen();
    setSelectedDay(timeline, DAY);
    setSelectedDay(support, DAY + 86_400_000);

    expect(getSelectedDay(timeline)).toBe(DAY);
    expect(getSelectedDay(support)).toBe(DAY + 86_400_000);
  });

  it('answers undefined for a screen or day never written', () => {
    expect(getScroll(freshScreen(), DAY)).toBeUndefined();
    expect(getSelectedDay(freshScreen())).toBeUndefined();
  });
});

// ── Writes are debounced ──────────────────────────────────────────────────────

describe('persistence', () => {
  it('does not write straight away', () => {
    setScroll(freshScreen(), DAY, 10);

    expect(setItem).not.toHaveBeenCalled();
  });

  it('coalesces a burst into a single write', async () => {
    const screen = freshScreen();
    // The shape of a real scroll: many samples, then drag-end and momentum-end.
    for (let x = 0; x < 20; x++) {
      setScroll(screen, DAY, x * 10);
    }

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();

    const scrollWrites = setItem.mock.calls.filter(([key]) => key === KEY_SCROLL);
    expect(scrollWrites).toHaveLength(1);
  });

  it('persists the latest value, not the first of the burst', async () => {
    const screen = freshScreen();
    setScroll(screen, DAY, 10);
    setScroll(screen, DAY, 999);

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();

    const [, written] = setItem.mock.calls.filter(([key]) => key === KEY_SCROLL).at(-1)!;
    expect(JSON.parse(written as string)[screen][String(DAY)]).toBe(999);
  });

  it('writes each dirty key once, not once per key per change', async () => {
    const screen = freshScreen();
    setScroll(screen, DAY, 1);
    setSelectedDay(screen, DAY);
    setHiddenCategories(['c1']);
    setScroll(screen, DAY, 2);

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();

    const keys = setItem.mock.calls.map(([key]) => key).sort();
    expect(keys).toEqual([KEY_HIDDEN, KEY_DAY, KEY_SCROLL].sort());
  });

  it('starts a fresh window for a change made after a flush', async () => {
    const screen = freshScreen();
    setScroll(screen, DAY, 1);
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();
    setItem.mockClear();

    setScroll(screen, DAY, 2);
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();

    expect(setItem.mock.calls.filter(([key]) => key === KEY_SCROLL)).toHaveLength(1);
  });
});

// ── Hydration ─────────────────────────────────────────────────────────────────

describe('hydrating at startup', () => {
  it('restores what was persisted', async () => {
    const screen = freshScreen();
    await AsyncStorage.setItem(KEY_SCROLL, JSON.stringify({ [screen]: { [String(DAY)]: 4321 } }));
    await AsyncStorage.setItem(KEY_DAY, JSON.stringify({ [screen]: DAY }));
    await AsyncStorage.setItem(KEY_HIDDEN, JSON.stringify(['c7']));

    await hydrateLocalState('ba2025');

    expect(getScroll(screen, DAY)).toBe(4321);
    expect(getSelectedDay(screen)).toBe(DAY);
    expect(getUiState('hiddenCategories')).toEqual(['c7']);
  });

  it('falls back rather than throwing on a corrupt value', async () => {
    await AsyncStorage.setItem(KEY_HIDDEN, 'not json');

    await expect(hydrateLocalState('ba2025')).resolves.toBeUndefined();

    // Startup must never be blocked by a bad stored value.
    expect(Array.isArray(getUiState('hiddenCategories'))).toBe(true);
  });

  it('never rejects when storage itself fails', async () => {
    const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    getItem.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(hydrateLocalState('ba2025')).resolves.toBeUndefined();
  });
});

// ── The lens ──────────────────────────────────────────────────────────────────

describe('the lens scope', () => {
  afterEach(() => {
    setLensScope({ kind: 'all' });
  });

  it('is restored at startup, so the lens can start from it', async () => {
    await AsyncStorage.setItem(KEY_LENS, JSON.stringify({ kind: 'me', level: 'must_see' }));

    await hydrateLocalState('ba2025');

    expect(getUiState('lensScope')).toEqual({ kind: 'me', level: 'must_see' });
  });

  it('never restores a friend\'s scope — the app does not open viewing a friend', async () => {
    await AsyncStorage.setItem(KEY_LENS, JSON.stringify({ kind: 'friend', token: 't1', level: null }));

    await hydrateLocalState('ba2025');

    expect(getUiState('lensScope')).toEqual({ kind: 'all' });
  });

  it('does not remember a friend\'s scope, keeping the last own one', () => {
    setLensScope({ kind: 'me', level: null });
    setLensScope({ kind: 'friend', token: 't1', level: null });

    expect(getUiState('lensScope')).toEqual({ kind: 'me', level: null });
  });

  it('is persisted, debounced like the rest', async () => {
    setItem.mockClear();
    setLensScope({ kind: 'me', level: 'maybe' });
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flush();

    expect(setItem).toHaveBeenCalledWith(KEY_LENS, JSON.stringify({ kind: 'me', level: 'maybe' }));
  });
});
