import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtistListScreen } from './ArtistListScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { useLens } from '../context/LensContext';
import { setLensScope } from '../store/uiStatePersistence';
import { DEFAULT_SCOPE } from '../utils/interestUtils';
import { createDataCollector, populateCache } from '../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── The artist list when a filter leaves nothing ──────────────────────────────
//
// Filters only ever narrow a loaded lineup, so an empty result is an answer and
// must say so — not fall back to the loading state, which reads as "still
// waiting" and never resolves.

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  }),
}));

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
});

beforeEach(async () => {
  await AsyncStorage.clear();
  // The lens remembers its scope (module state, read when the provider is
  // created); start every case from "everything".
  setLensScope(DEFAULT_SCOPE);
});

function MyPicksLens() {
  const { setScope } = useLens();
  useEffect(() => { setScope({ kind: 'me', level: null }); }, [setScope]);
  return null;
}

it('says so when a search matches nothing', async () => {
  await render(<PerfProviders><ArtistListScreen /></PerfProviders>);
  expect(screen.getByText('3 INCHES OF BLOOD')).toBeTruthy();

  await act(async () => {
    screen.getByPlaceholderText('Search artists…').props.onChangeText('zzzz-no-such-band');
  });

  expect(screen.getByText('No artists found')).toBeTruthy();
  expect(screen.queryByText('Loading artists…')).toBeNull();
});

it('says so when "my picks" has no picks yet', async () => {
  await render(
    <PerfProviders>
      <>
        <MyPicksLens />
        <ArtistListScreen />
      </>
    </PerfProviders>,
  );

  expect(await screen.findByText('No artists found')).toBeTruthy();
  expect(screen.queryByText('3 INCHES OF BLOOD')).toBeNull();
});
