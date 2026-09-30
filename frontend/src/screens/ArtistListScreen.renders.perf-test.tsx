import React from 'react';
import { measureRenders } from 'reassure';
import { act, screen } from '@testing-library/react-native';
import { ArtistListScreen } from './ArtistListScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { createDataCollector, populateCache } from '../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for the artist list ─────────────────────────────────────────
//
// Counts, not milliseconds. A render count is deterministic and identical on any
// machine, which makes it the one metric worth gating in CI — and it is the
// thing that actually regresses when a memo or a context dependency is got
// wrong, which is what both of the recent bugs were.

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
});

test('mounting the artist list', async () => {
  await measureRenders(<ArtistListScreen />, { ...MEASURE_OPTIONS, wrapper: PerfProviders });
});

test('typing one character into search', async () => {
  // The expensive path: the memo depends on the query, so the whole grouping and
  // its collated sort re-run. What is gated here is that it costs a bounded
  // number of renders — not that the sort got faster.
  await measureRenders(<ArtistListScreen />, {
    ...MEASURE_OPTIONS,
    wrapper: PerfProviders,
    scenario: async () => {
      const search = screen.getByPlaceholderText('Search artists…');
      await act(async () => { search.props.onChangeText('m'); });
    },
  });
});

test('pressing one star', async () => {
  // A star press changes the interest map, which every context consumer sees.
  // If this count climbs, something stopped memoising and the whole list is
  // re-rendering for one row's change.
  await measureRenders(<ArtistListScreen />, {
    ...MEASURE_OPTIONS,
    wrapper: PerfProviders,
    scenario: async () => {
      const stars = screen.getAllByLabelText('Toggle interest');
      await act(async () => { stars[0].props.onClick?.() ?? stars[0].props.onPress?.(); });
    },
  });
});
