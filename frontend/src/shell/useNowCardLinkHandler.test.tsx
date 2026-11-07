import React from 'react';
import { act, render } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useNowCardLinkHandler } from './useNowCardLinkHandler';
import { usePlanStore } from '../screens/my-plan/PlanContext';
import { useSearch } from '../features/search/SearchContext';
import { useLensPanel } from '../features/social/LensContext';
import { usePlanPanel } from '../screens/my-plan/PlanContext';
import { useArtistDetail } from '../features/artist-detail/ArtistDetailContext';
import { useConflictDetail } from '../features/conflicts/ConflictDetailContext';
import { useOpenStarSelector, useStarSelectorActions, type MeasurableStar } from '../features/interests/StarSelectorContext';
import { navigationRef } from '../navigation/navigationRef';
// The drawer joins the overlay hub when this module loads, as it does in the app.
import '../navigation/drawerOverlay';
import type { DbArtist, DbEvent } from '../types/backend';
import { FeatureProviders } from '../../tests/setup/PerfProviders';

// ── A tap on the lock-screen now card opens My plan at now ────────────────────
//
// Dimensions: how the link arrives (it launched the app; it came while running);
// whether navigation is ready yet (a cold start restores its state first); the
// link (the card's, or another one); what is open over the screen (nothing; the
// search, the lens or plan filter panel, the drawer, the artist or conflict
// sheet, the star selector — the card closes them all, utils/overlayHub
// closeAll). Opening My plan at now is what the now pill does off My plan:
// today, scrolled to now.

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn(), addListener: jest.fn(), dispatch: jest.fn() },
}));

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'cardtest' };
});

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, isRestoringSession: false, userId: null, email: null, name: null, getAccessToken: async () => null, signIn: async () => undefined, signOut: async () => undefined }),
}));

const linking = Linking as jest.Mocked<typeof Linking>;
const nav = navigationRef as unknown as { isReady: jest.Mock; navigate: jest.Mock; addListener: jest.Mock; dispatch: jest.Mock };

const ARTIST = { slug: 'cardtest', artistId: 'a1', name: 'Band', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] } as DbArtist;
const EVENT = { slug: 'cardtest', eventId: 'e1', dateFrom: 0, dateTo: 1 } as DbEvent;
/** A star that reports where it is, as a real one does once laid out. */
const STAR: MeasurableStar = { measureInWindow: (cb) => { cb(322, 300, 26, 30); } };

let urlListener: ((event: { url: string }) => void) | null = null;
let readyListener: (() => void) | null = null;
let store: ReturnType<typeof usePlanStore>;
let search: ReturnType<typeof useSearch>;
let lensPanel: ReturnType<typeof useLensPanel>;
let planPanel: ReturnType<typeof usePlanPanel>;
let artistDetail: ReturnType<typeof useArtistDetail>;
let conflictDetail: ReturnType<typeof useConflictDetail>;
let starActions: ReturnType<typeof useStarSelectorActions>;
let openStar: ReturnType<typeof useOpenStarSelector>;

function Probe() {
  useNowCardLinkHandler();
  store = usePlanStore();
  search = useSearch();
  lensPanel = useLensPanel();
  planPanel = usePlanPanel();
  artistDetail = useArtistDetail();
  conflictDetail = useConflictDetail();
  starActions = useStarSelectorActions();
  openStar = useOpenStarSelector();
  return null;
}

async function tapCard(): Promise<void> {
  await act(async () => { urlListener?.({ url: 'ba://my-plan/now' }); });
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

it('closes an open lens panel', async () => {
  await mount();
  await act(async () => { lensPanel.toggle(); });
  expect(lensPanel.isOpen).toBe(true);
  await tapCard();
  expect(lensPanel.isOpen).toBe(false);
});

it('closes an open plan filter panel', async () => {
  await mount();
  await act(async () => { planPanel.toggle(); });
  expect(planPanel.isOpen).toBe(true);
  await tapCard();
  expect(planPanel.isOpen).toBe(false);
});

it('closes the drawer', async () => {
  await mount();
  await tapCard();
  expect(nav.dispatch).toHaveBeenCalledWith({ type: 'CLOSE_DRAWER' });
});

it('closes the drawer only once navigation is ready on a cold start', async () => {
  nav.isReady.mockReturnValue(false);
  linking.getInitialURL.mockResolvedValue('ba://my-plan/now');
  await mount();
  expect(nav.dispatch).not.toHaveBeenCalled();
  nav.isReady.mockReturnValue(true);
  await act(async () => { readyListener?.(); });
  expect(nav.dispatch).toHaveBeenCalledWith({ type: 'CLOSE_DRAWER' });
});

it('closes an open artist sheet, even over the search', async () => {
  await mount();
  await act(async () => { search.open(); });
  await act(async () => { artistDetail.openDetail(ARTIST, 'expanded'); });
  expect(search.isOpen).toBe(true);
  expect(artistDetail.detailState.artist).not.toBeNull();
  await tapCard();
  expect(artistDetail.detailState.artist).toBeNull();
  expect(search.isOpen).toBe(false);
});

it('closes an open conflict sheet', async () => {
  await mount();
  await act(async () => { conflictDetail.openConflict(EVENT); });
  expect(conflictDetail.conflictState.event).not.toBeNull();
  await tapCard();
  expect(conflictDetail.conflictState.event).toBeNull();
});

it('closes an open star selector', async () => {
  await mount();
  await act(async () => { starActions.pressStar({ artistId: ARTIST.artistId, size: 'small', star: STAR }); });
  expect(openStar).not.toBeNull();
  await tapCard();
  expect(openStar).toBeNull();
});
