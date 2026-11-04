import React from 'react';
import { act, render } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useNowCardLinkHandler } from './useNowCardLinkHandler';
import { usePlanStore } from '../screens/my-plan/PlanContext';
import { useSearch } from '../features/search/SearchContext';
import { navigationRef } from '../navigation/navigationRef';
import { FeatureProviders } from '../../tests/setup/PerfProviders';

// ── A tap on the lock-screen now card opens My plan at now ────────────────────
//
// Dimensions: how the link arrives (it launched the app; it came while running);
// whether navigation is ready yet (a cold start restores its state first); the
// link (the card's, or another one); search (open or closed). Opening My plan
// at now is what the now pill does off My plan: today, scrolled to now.

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn(), addListener: jest.fn() },
}));

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'cardtest' };
});

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, isRestoringSession: false, userId: null, email: null, name: null, getAccessToken: async () => null, signIn: async () => undefined, signOut: async () => undefined }),
}));

const linking = Linking as jest.Mocked<typeof Linking>;
const nav = navigationRef as unknown as { isReady: jest.Mock; navigate: jest.Mock; addListener: jest.Mock };

let urlListener: ((event: { url: string }) => void) | null = null;
let readyListener: (() => void) | null = null;
let store: ReturnType<typeof usePlanStore>;
let search: ReturnType<typeof useSearch>;

function Probe() {
  useNowCardLinkHandler();
  store = usePlanStore();
  search = useSearch();
  return null;
}

beforeEach(() => {
  urlListener = null;
  readyListener = null;
  linking.getInitialURL.mockResolvedValue(null);
  linking.addEventListener.mockImplementation(((_type: string, listener: (event: { url: string }) => void) => {
    urlListener = listener;
    return { remove: jest.fn() };
  }) as unknown as typeof Linking.addEventListener);
  nav.isReady.mockReturnValue(true);
  nav.addListener.mockImplementation((_type: string, listener: () => void) => {
    readyListener = listener;
    return jest.fn();
  });
});

async function mount(): Promise<void> {
  await render(<FeatureProviders><Probe /></FeatureProviders>);
  await act(async () => { await Promise.resolve(); });
}

it('opens My plan at now when the card launched the app', async () => {
  linking.getInitialURL.mockResolvedValue('ba://my-plan/now');
  await mount();
  expect(nav.navigate).toHaveBeenCalledWith('MyPlan');
  expect(store.takeLanding()).toEqual({ kind: 'now' });
});

it('opens My plan at now when the card is tapped while the app runs', async () => {
  await mount();
  expect(nav.navigate).not.toHaveBeenCalled();
  await act(async () => { urlListener?.({ url: 'ba://my-plan/now' }); });
  expect(nav.navigate).toHaveBeenCalledWith('MyPlan');
  expect(store.takeLanding()).toEqual({ kind: 'now' });
});

it('waits for navigation to be ready on a cold start', async () => {
  nav.isReady.mockReturnValue(false);
  linking.getInitialURL.mockResolvedValue('ba://my-plan/now');
  await mount();
  expect(nav.navigate).not.toHaveBeenCalled();
  nav.isReady.mockReturnValue(true);
  await act(async () => { readyListener?.(); });
  expect(nav.navigate).toHaveBeenCalledWith('MyPlan');
  expect(store.takeLanding()).toEqual({ kind: 'now' });
});

it('ignores other links', async () => {
  linking.getInitialURL.mockResolvedValue('ba://add-friend/0123');
  await mount();
  await act(async () => { urlListener?.({ url: 'https://ba.janbambas.cz/' }); });
  expect(nav.navigate).not.toHaveBeenCalled();
  expect(store.takeLanding()).toBeNull();
});

it('closes an open search first, as the now pill does', async () => {
  await mount();
  await act(async () => { search.open(); });
  expect(search.isOpen).toBe(true);
  await act(async () => { urlListener?.({ url: 'ba://my-plan/now' }); });
  expect(search.isOpen).toBe(false);
  expect(nav.navigate).toHaveBeenCalledWith('MyPlan');
});
