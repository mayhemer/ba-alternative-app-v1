import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ConflictTimeline } from './ConflictTimeline';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';
import { createDataCollector, populateCache } from '../../cache/cacheService';
import { getCategoryLocalized } from '../../utils/localization';
import { getFestivalDayStart } from './timelineLayout';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── The conflict sheet's timeline ─────────────────────────────────────────────
//
// Only the sets it is given, each in its own category's lane, bands and support
// programme alike: the sheet shows one clash group, from both timelines.

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

const ARTISTS = artistsFixture as unknown as DbArtist[];
const CATEGORIES = categoriesFixture as unknown as DbCategory[];
const EVENTS = scheduleFixture as unknown as DbEvent[];
const artistOf = (e: DbEvent): DbArtist => ARTISTS.find((a) => a.artistId === e.artistId)!;
const laneTitle = (e: DbEvent): string =>
  getCategoryLocalized(CATEGORIES.find((c) => c.categoryId === e.categoryId)!.localized, 'title');

// From the real schedule: a band, a support-programme set on the same day, and
// another band on the band's own stage lane that is not part of the group.
const band = EVENTS.find((e) => artistOf(e)?.isPlayable === true)!;
const day = getFestivalDayStart(band.dateFrom);
const support = EVENTS.find((e) => artistOf(e)?.isPlayable === false && getFestivalDayStart(e.dateFrom) === day && e.categoryId !== band.categoryId)!;
const outsider = EVENTS.find((e) => e.eventId !== band.eventId && e.categoryId === band.categoryId && getFestivalDayStart(e.dateFrom) === day)!;

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(ARTISTS);
  collector.setCategories(CATEGORIES);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(EVENTS);
  populateCache('ba2025', collector.build(), band.dateFrom);
});

async function renderGroup(onBlockPress = jest.fn()) {
  await render(
    <FeatureProviders>
      <ConflictTimeline events={[band, support]} onBlockPress={onBlockPress} />
    </FeatureProviders>,
  );
  return onBlockPress;
}

it('found the sets it needs in the fixture', () => {
  expect([band, support, outsider].every((e) => e !== undefined)).toBe(true);
});

it('shows the group\'s sets from both timelines, each in its lane', async () => {
  await renderGroup();
  expect(screen.getAllByText(artistOf(band).name).length).toBeGreaterThan(0);
  expect(screen.getAllByText(artistOf(support).name).length).toBeGreaterThan(0);
  expect(screen.getByText(laneTitle(band))).toBeTruthy();
  expect(screen.getByText(laneTitle(support))).toBeTruthy();
});

it('leaves out every other set, even on the same lane', async () => {
  await renderGroup();
  expect(screen.queryByText(artistOf(outsider).name)).toBeNull();
});

it('opens a set when its block is tapped', async () => {
  const onBlockPress = await renderGroup();
  await fireEvent.press(screen.getAllByText(artistOf(band).name)[0]);
  expect(onBlockPress).toHaveBeenCalledWith(band, artistOf(band));
});
