// ── Shared test setup ─────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { setCurrentTimeMs } from '../../src/utils/clock';
import { loadFonts } from '../../src/styling/fonts';

// AsyncStorage is a native module; its maintained mock keeps an in-memory map,
// which is what the cache and UI-state persistence tests read back.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Reanimated's supported Jest setup: its resolver (in the Jest configs) loads the
// web implementations of Reanimated and Worklets, and this adds its matchers.
// https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/
// Native presets only: the web preset runs no component tests, and under jsdom
// Reanimated fails at import (no window.matchMedia).
if (Platform.OS !== 'web') {
  require('react-native-reanimated').setUpTests();
}

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

// jest-expo 58 mocks react-native/asset-registry, but expo-asset ≥58.0.16 reads
// RN 0.88's `AssetRegistry` export, which goes to this private module and so
// bypasses that mock: every font load fails with 'Module "1" is missing from the
// asset registry'. Point it at jest-expo's mock. Remove once
// https://github.com/expo/expo/issues/51834 ships in a jest-expo release.
jest.doMock(
  require.resolve('react-native/src/private/assets/AssetRegistry', {
    paths: [require('path').dirname(require.resolve('react-native/package.json'))],
  }),
  () => ({ AssetRegistry: jest.requireMock('react-native/asset-registry') }),
);

// The app loads its fonts behind the splash (StartupGate), so every component
// mounts with them in. Without this, the first icon of a test file finds its font
// missing, loads it and re-renders — an extra commit that exists only here, and
// that Reassure, which reads mount issues off its first run, would report.
beforeAll(async () => {
  await loadFonts();
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
