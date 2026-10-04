// ── Shared test setup ─────────────────────────────────────────────────────────

import { setCurrentTimeMs } from '../../src/utils/clock';

// AsyncStorage is a native module; its maintained mock keeps an in-memory map,
// which is what the cache and UI-state persistence tests read back.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// SecureStore backs the native half of tokenStorage. jest-expo auto-mocks the
// module so calls do not crash, but that stub stores nothing — a write followed
// by a read comes back empty, which would make every token test vacuous. This
// is a real in-memory store instead.
//
// getItemAsync returns **null** for a missing key, matching the real API. The
// stub's `undefined` matters: loadTokens checks `stored === null`, so undefined
// slips past it into JSON.parse, throws, and lands in the corrupt-entry branch
// — which clears storage. "Nothing stored" would silently exercise the wrong
// path and still look green.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
    __reset: () => { store.clear(); },
  };
});

// Reanimated's Jest build cannot scroll, and warns on every scrollTo() call —
// the timeline restores its scroll position that way on each mount, so the perf
// suite, which mounts it a few hundred times, printed it a few hundred times.
// Only this one message is dropped; every other warning still shows.
const warn = console.warn;
jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('scrollTo() is not supported with Jest')) {
    return;
  }
  warn(...args);
});

afterEach(() => {
  // Every case starts on the real clock. A case that cares pins it explicitly
  // with setCurrentTimeMs(Date.parse('…+02:00')) — an explicit offset, so the
  // suite does not depend on the runner's timezone (as the backend does too).
  setCurrentTimeMs(null);

  // Tokens are module-level state in both backing stores; leaking them between
  // cases is the same trap the slug-keyed caches have.
  (jest.requireMock('expo-secure-store') as { __reset: () => void }).__reset();
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.clear();
  }
});
