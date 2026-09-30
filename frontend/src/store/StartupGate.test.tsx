import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StartupGate } from './StartupGate';
import { startSync, stop } from '../sync/backgroundSyncService';
import { hydrateLocalState } from './uiStatePersistence';

// ── Jest mocks ────────────────────────────────────────────────────────────────
// The gate's whole job is sequencing, so everything it sequences is replaced and
// the test drives the timing by hand. `mock`-prefixed names are the only ones
// jest.mock factories may close over, since they are hoisted above this file.

let mockSelectedSlug: string | null = 'ba2025';

jest.mock('./AppContext', () => ({
  useAppContext: () => ({ state: { selectedSlug: mockSelectedSlug } }),
}));

jest.mock('../sync/backgroundSyncService', () => ({
  startSync: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('./uiStatePersistence', () => ({
  hydrateLocalState: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => undefined),
}));

jest.mock('../screens/SplashScreen', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    SplashScreen: ({ error, onRetry }: { error: string | null; onRetry: () => void }) =>
      ReactActual.createElement(
        RNText,
        { onPress: onRetry, testID: 'splash' },
        error === null ? 'loading' : `error:${error}`,
      ),
  };
});

const mockStartSync = startSync as jest.MockedFunction<typeof startSync>;
const mockStop = stop as jest.MockedFunction<typeof stop>;
const mockHydrate = hydrateLocalState as jest.MockedFunction<typeof hydrateLocalState>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function deferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

// The callbacks the gate handed to startSync on its most recent run.
function latestCallbacks() {
  return mockStartSync.mock.calls.at(-1)![1];
}

const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

function Child() {
  return <Text>app</Text>;
}

async function mount() {
  await render(<StartupGate><Child /></StartupGate>);
}

beforeEach(() => {
  mockSelectedSlug = 'ba2025';
  mockHydrate.mockResolvedValue(undefined);
  mockStartSync.mockImplementation(() => undefined);
});

// ── Gating ────────────────────────────────────────────────────────────────────

describe('the startup gate', () => {
  it('holds the splash until both halves finish', async () => {
    const local = deferred();
    mockHydrate.mockReturnValue(local.promise);

    await mount();
    expect(screen.getByTestId('splash')).toBeTruthy();

    // External data is in, local state is not: still not ready.
    await act(async () => { latestCallbacks().onFirstLoadSuccess(); await flush(); });
    expect(screen.queryByText('app')).toBeNull();

    await act(async () => { local.resolve(); await flush(); });
    expect(screen.getByText('app')).toBeTruthy();
  });

  it('holds the splash when only local state is ready', async () => {
    await mount();

    // hydrateLocalState resolved on its own; the network half has not reported.
    await act(async () => { await flush(); });

    expect(screen.queryByText('app')).toBeNull();
  });

  it('starts the sync for the resolved slug', async () => {
    await mount();

    expect(mockStartSync).toHaveBeenCalledTimes(1);
    expect(mockStartSync.mock.calls[0][0]).toBe('ba2025');
  });

  it('waits for the slug before booting anything', async () => {
    mockSelectedSlug = null;

    await mount();

    // Booting under a null slug would read an empty cache and cache the result.
    expect(mockStartSync).not.toHaveBeenCalled();
    expect(screen.getByTestId('splash')).toBeTruthy();
  });
});

// ── Failure and retry ─────────────────────────────────────────────────────────

describe('when the first load fails', () => {
  it('shows the error instead of the app', async () => {
    await mount();

    await act(async () => {
      latestCallbacks().onFirstLoadError(new Error('offline'));
      await flush();
    });

    expect(screen.getByText('error:offline')).toBeTruthy();
  });

  it('retries from the beginning', async () => {
    await mount();
    await act(async () => {
      latestCallbacks().onFirstLoadError(new Error('offline'));
      await flush();
    });

    await act(async () => { fireEvent.press(screen.getByTestId('splash')); await flush(); });

    expect(mockStartSync).toHaveBeenCalledTimes(2);
  });

  it('opens the app when the retry succeeds', async () => {
    await mount();
    await act(async () => {
      latestCallbacks().onFirstLoadError(new Error('offline'));
      await flush();
    });
    await act(async () => { fireEvent.press(screen.getByTestId('splash')); await flush(); });

    await act(async () => { latestCallbacks().onFirstLoadSuccess(); await flush(); });

    expect(screen.getByText('app')).toBeTruthy();
  });
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

describe('lifecycle', () => {
  it('stops the sync when it goes away', async () => {
    const view = await render(<StartupGate><Child /></StartupGate>);
    await act(async () => { latestCallbacks().onFirstLoadSuccess(); await flush(); });

    await view.unmount();

    // Leaving a poll timer behind would keep hitting the API for an app that is
    // no longer on screen.
    expect(mockStop).toHaveBeenCalled();
  });
});
