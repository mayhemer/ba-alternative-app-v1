import React from 'react';
import { measureRenders } from 'reassure';
import { act } from '@testing-library/react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { FeatureProviders } from '../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { LensChip } from '../features/social/LensChip';
import { LensPanel } from '../features/social/LensPanel';
import { SideDrawerContent } from './SideDrawerContent';
import { useLens } from '../features/social/LensContext';
import { useInterestCycle } from '../features/interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../cache/cacheService';
import { setLensScope } from '../store/uiStatePersistence';
import { DEFAULT_SCOPE, type LensScope } from '../features/interests/interestUtils';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for the chrome ──────────────────────────────────────────────
//
// The lens chip, the lens panel and the drawer, without a screen: one change
// each. Which of their elements render inside the commit is checked by the
// render counts in chrome.test.tsx.

const SLUG = 'ba2025';
// CRYSTAL LAKE (35) and EXORCIZPHOBIA (216) overlap on Wednesday.
const CRYSTAL_LAKE = '35';
const EXORCIZPHOBIA = '216';

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache(SLUG, collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
});

// Stable, as the navigator's are.
const DRAWER_PROPS = {
  navigation: { navigate: () => undefined, dispatch: () => undefined },
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

function Chrome() {
  return (
    <>
      <Controls />
      <LensChip />
      <LensPanel />
      <SideDrawerContent {...DRAWER_PROPS} />
    </>
  );
}

function Wrapper({ children }: { children: React.ReactElement }) {
  return <FeatureProviders>{children}</FeatureProviders>;
}

async function picks(statuses: Record<string, 'none' | 'maybe' | 'will_go'>): Promise<void> {
  for (const [artistId, status] of Object.entries(statuses)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
}

test('chrome: lens to My picks', async () => {
  await measureRenders(<Chrome />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    // The lens is remembered: every run starts from Everything.
    beforeEach: async () => { setLensScope(DEFAULT_SCOPE); },
    scenario: async () => {
      await act(async () => { setScope({ kind: 'me', level: null }); });
    },
  });
  setLensScope(DEFAULT_SCOPE);
});

test('chrome: a star into a conflict (drawer count)', async () => {
  await measureRenders(<Chrome />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    beforeEach: () => picks({ [CRYSTAL_LAKE]: 'will_go', [EXORCIZPHOBIA]: 'maybe' }),
    scenario: async () => {
      // Maybe → Must-see: the two clash.
      await act(async () => { cycle(EXORCIZPHOBIA); });
    },
  });
  await picks({ [CRYSTAL_LAKE]: 'none', [EXORCIZPHOBIA]: 'none' });
});
