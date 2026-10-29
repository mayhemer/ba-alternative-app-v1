import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { FeatureProviders } from '../../tests/setup/PerfProviders';
import { LensChip } from '../features/social/LensChip';
import { LensPanel } from '../features/social/LensPanel';
import { SideDrawerContent } from './SideDrawerContent';
import { useLens } from '../features/social/LensContext';
import { useInterestCycle } from '../features/interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../cache/cacheService';
import { hydrateSocial, saveFriends } from '../cache/socialCache';
import { setLensScope } from '../store/uiStatePersistence';
import { DEFAULT_SCOPE, type LensScope } from '../features/interests/interestUtils';
import { rendersSinceReset, resetRenders } from '../../tests/setup/countRenders';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

// ── The chrome reacts to every input ──────────────────────────────────────────
//
// The lens chip, the lens panel (open) and the drawer, on a small edition of
// their own: ALPHA and BRAVO play at the same time, a friend (Anna) is followed.
// The inputs: the lens, a friend's removal, my picks (a clash for the drawer's
// count). Then the render counts, by key: `lens-chip`, each panel row (`all`,
// `me`, the friend's token), each drawer entry (its screen).

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'chrometest' };
});

// One auth value for the whole run, as the real provider memoises its own.
jest.mock('../auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});

jest.mock('../features/social/LensChipView', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../features/social/LensChipView');
  return { ...actual, LensChipView: counted(actual.LensChipView) };
});
jest.mock('../features/social/LensScopeRow', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../features/social/LensScopeRow');
  return { ...actual, LensScopeRow: counted(actual.LensScopeRow) };
});
jest.mock('./DrawerItem', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('./DrawerItem');
  return { ...actual, DrawerItem: counted(actual.DrawerItem) };
});

const SLUG = 'chrometest';
const at = (iso: string): number => Date.parse(iso);

function seedEdition(): void {
  const artist = (artistId: string): DbArtist => ({ slug: SLUG, artistId, name: artistId.toUpperCase(), isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] });
  const set = (artistId: string): DbEvent => ({ slug: SLUG, eventId: `e-${artistId}`, artistId, stageId: 's', categoryId: '1',
    dateFrom: at('2025-08-06T14:00:00+02:00'), dateTo: at('2025-08-06T15:00:00+02:00') });
  const collector = createDataCollector();
  collector.setArtists([artist('alpha'), artist('bravo')]);
  collector.setCategories([{ slug: SLUG, categoryId: '1', color: 0, localized: [] } as unknown as DbCategory]);
  collector.setStages([{ slug: SLUG, stageId: 's', imageUrl: '', thumbUrl: '', localized: [] } as unknown as DbStage]);
  collector.setEvents([set('alpha'), set('bravo')]);
  populateCache(SLUG, collector.build(), at('2025-08-06T09:00:00+02:00'));
}

// Stable, as the navigator's are: the drawer's press handler depends on them.
const DRAWER_PROPS = {
  navigation: { navigate: jest.fn(), dispatch: jest.fn() },
  state: { index: 0, routes: [{ name: 'ArtistList' }] },
} as unknown as DrawerContentComponentProps;

let setScope: (scope: LensScope) => void;
let cycle: (artistId: string) => void;

function Controls() {
  setScope = useLens().setScope;
  const { cycleStatus } = useInterestCycle();
  cycle = (artistId) => { cycleStatus(artistId); };
  return null;
}

beforeEach(async () => {
  seedEdition();
  setLensScope(DEFAULT_SCOPE);
  await saveFriends(SLUG, [{ token: 'ta', label: 'Anna', slug: SLUG, interests: { alpha: 'will_go' }, fetchedAt: 0 }]);
  await hydrateSocial(SLUG);
  await setInterest(SLUG, 'alpha', 'will_go');
  await setInterest(SLUG, 'bravo', 'none');
  await hydrateInterests(SLUG);
});

async function mountChrome(): Promise<void> {
  await render(
    <FeatureProviders>
      <Controls />
      <LensChip />
      <LensPanel />
      <SideDrawerContent {...DRAWER_PROPS} />
    </FeatureProviders>,
  );
  // Open the panel, as a tap on the chip does.
  await fireEvent.press(screen.getByLabelText('View and share schedules'));
}

describe('the chrome reacts', () => {
  it('lists the followed friend, and drops them once removed', async () => {
    await mountChrome();
    expect(screen.getByText('Anna')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remove Anna'));
    await fireEvent.press(screen.getByText('Remove'));
    expect(screen.queryByText('Anna')).toBeNull();
  });

  it('closes the panel once a source is chosen', async () => {
    await mountChrome();
    await fireEvent.press(screen.getByText('My picks'));
    expect(screen.queryByText('Everything')).toBeNull();
  });

  it("counts the clash in the drawer once a pick makes one, and drops it when it ends", async () => {
    await mountChrome();
    expect(screen.queryByTestId('drawer-conflict-marker')).toBeNull();
    // none → Maybe → Must-see.
    await act(async () => { cycle('bravo'); });
    await act(async () => { cycle('bravo'); });
    expect(screen.getByTestId('drawer-conflict-marker')).toBeTruthy();
    expect(screen.getByLabelText('My plan, 2 conflicts')).toBeTruthy();
    // Must-see → don't go.
    await act(async () => { cycle('bravo'); });
    expect(screen.queryByTestId('drawer-conflict-marker')).toBeNull();
  });

  describe('render counts', () => {
    async function mountCounted(): Promise<void> {
      await mountChrome();
      resetRenders();
    }

    it('the lens on my picks renders the chip and the two rows whose mark moved', async () => {
      await mountCounted();
      await act(async () => { setScope({ kind: 'me', level: null }); });
      expect(rendersSinceReset()).toEqual({ 'lens-chip': 1, all: 1, me: 1 });
    });

    it("arming a friend's removal renders only their row", async () => {
      await mountCounted();
      await fireEvent.press(screen.getByLabelText('Remove Anna'));
      expect(rendersSinceReset()).toEqual({ ta: 1 });
    });

    it("a pick that makes a clash renders only My plan's drawer entry", async () => {
      await mountChrome();
      // none → Maybe first: no clash yet.
      await act(async () => { cycle('bravo'); });
      resetRenders();
      // Maybe → Must-see.
      await act(async () => { cycle('bravo'); });
      expect(rendersSinceReset()).toEqual({ MyPlan: 1 });
    });

    it('a pick that makes no clash renders none of the chrome', async () => {
      await mountCounted();
      // none → Maybe: a Maybe does not clash.
      await act(async () => { cycle('bravo'); });
      expect(rendersSinceReset()).toEqual({});
    });
  });
});
