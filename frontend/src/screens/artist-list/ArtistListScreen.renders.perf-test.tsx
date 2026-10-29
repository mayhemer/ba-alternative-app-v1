import React from 'react';
import { measureRenders } from 'reassure';
import { act, screen } from '@testing-library/react-native';
import { useLens } from '../../features/social/LensContext';
import { setLensScope } from '../../store/uiStatePersistence';
import { DEFAULT_SCOPE, type LensScope } from '../../features/interests/interestUtils';
import { ArtistListScreen } from './ArtistListScreen';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../../tests/setup/perfOptions';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for the artist list ─────────────────────────────────────────
//
// Counts, not milliseconds. A render count is deterministic and identical on any
// machine, which makes it the one metric worth gating in CI — and it is the
// thing that actually regresses when a memo or a context dependency is got
// wrong, which is what both of the recent bugs were.

/** Syncs the cache with the fixture, its artists changed by `change`, as a background sync does. */
function syncWith(change: (artists: DbArtist[]) => DbArtist[] = (artists) => artists): void {
  const collector = createDataCollector();
  collector.setArtists(change(artistsFixture as unknown as DbArtist[]));
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
}

beforeAll(() => {
  syncWith();
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

// ── The lens and a sync ───────────────────────────────────────────────────────
//
// Like the scenarios above, each ends right after the change. Which rows render
// inside it is checked by the render counts in ArtistListScreen.test.tsx.

let setScope: (scope: LensScope) => void;

function LensControl() {
  setScope = useLens().setScope;
  return null;
}

function WithLens() {
  return (
    <>
      <LensControl />
      <ArtistListScreen />
    </>
  );
}

test('artist list: lens to My picks', async () => {
  // Two picks among the rows on screen: the lens keeps them, drops the rest.
  await setInterest('ba2025', '92', 'maybe');
  await setInterest('ba2025', '163', 'will_go');
  await hydrateInterests('ba2025');
  try {
    await measureRenders(<WithLens />, {
      ...MEASURE_OPTIONS,
      wrapper: PerfProviders,
      // The lens is remembered: every run starts from Everything.
      beforeEach: async () => { setLensScope(DEFAULT_SCOPE); },
      scenario: async () => {
        await act(async () => { setScope({ kind: 'me', level: null }); });
      },
    });
  } finally {
    await setInterest('ba2025', '92', 'none');
    await setInterest('ba2025', '163', 'none');
    await hydrateInterests('ba2025');
    setLensScope(DEFAULT_SCOPE);
  }
});

test('artist list: a sync that changes one artist', async () => {
  // ABSU, on screen, renamed.
  await measureRenders(<ArtistListScreen />, {
    ...MEASURE_OPTIONS,
    wrapper: PerfProviders,
    beforeEach: async () => { syncWith(); },
    scenario: async () => {
      await act(async () => {
        syncWith((artists) => artists.map((a) => (a.artistId === '101' ? { ...a, name: 'ABSU (US)' } : a)));
      });
    },
  });
  syncWith();
});
