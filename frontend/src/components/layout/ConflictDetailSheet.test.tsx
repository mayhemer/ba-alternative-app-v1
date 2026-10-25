import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ConflictDetailSheet } from './ConflictDetailSheet';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { useConflictDetail } from '../../context/ConflictDetailContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── The conflict sheet's header ───────────────────────────────────────────────
//
// It names the clash group's calendar date and its span, from the first set's
// start to the last one's end. A clash after midnight is dated the next day, as
// any date is; only the timeline's day tabs run 06:00 to 06:00.

jest.mock('@gorhom/bottom-sheet', () => ({ __esModule: true, ...require('@gorhom/bottom-sheet/mock') }));

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../../context/AuthContext', () => ({
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

const EVENTS = scheduleFixture as unknown as DbEvent[];
const byId = (eventId: string): DbEvent => EVENTS.find((e) => e.eventId === eventId)!;

// Wednesday 14:00–14:40 CRYSTAL LAKE (35) and 14:30–15:05 EXORCIZPHOBIA (216);
// Wednesday night, after midnight, 00:30–01:15 THRASH COBRA (160) and
// 00:35–01:30 ROTTING CHRIST (103).
const PICKS = ['35', '216', '160', '103'];

beforeAll(async () => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(EVENTS);
  populateCache('ba2025', collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
  for (const artistId of PICKS) {
    await setInterest('ba2025', artistId, 'will_go');
  }
  await hydrateInterests('ba2025');
});

afterAll(async () => {
  for (const artistId of PICKS) {
    await setInterest('ba2025', artistId, 'none');
  }
  await hydrateInterests('ba2025');
});

let openConflict: (event: DbEvent) => void;

function Controls() {
  ({ openConflict } = useConflictDetail());
  return null;
}

async function openWith(event: DbEvent): Promise<void> {
  await render(<PerfProviders><><Controls /><ConflictDetailSheet /></></PerfProviders>);
  await act(async () => { openConflict(event); });
}

it('names the day and the span of a daytime clash', async () => {
  await openWith(byId('7022'));
  expect(screen.getByText('Wed 6  ·  14:00–15:05')).toBeTruthy();
});

it('dates a clash after midnight to the next day', async () => {
  await openWith(byId('7055'));
  expect(screen.getByText('Thu 7  ·  00:30–01:30')).toBeTruthy();
});
