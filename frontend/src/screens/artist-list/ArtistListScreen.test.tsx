import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtistListScreen } from './ArtistListScreen';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { useLens } from '../../features/social/LensContext';
import { setLensScope } from '../../store/uiStatePersistence';
import { DEFAULT_SCOPE } from '../../features/interests/interestUtils';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import { useInterestCycle } from '../../features/interests/InterestContext';
import { rendersSinceReset, resetRenders } from '../../../tests/setup/countRenders';
import type { LensScope } from '../../features/interests/interestUtils';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── The artist list when a filter leaves nothing ──────────────────────────────
//
// Filters only ever narrow a loaded lineup, so an empty result is an answer and
// must say so — not fall back to the loading state, which reads as "still
// waiting" and never resolves.

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

// The row is swapped for a counting copy that renders exactly the same
// (tests/setup/countRenders.ts), for the render counts at the end.
jest.mock('./ArtistRow', () => {
  const { counted } = require('../../../tests/setup/countRenders');
  const actual = jest.requireActual('./ArtistRow');
  return { ...actual, ArtistRow: counted(actual.ArtistRow) };
});

// One auth value for the whole run, as the real provider memoises its own: a
// fresh getAccessToken on every call would change the interest context on each
// pick, and every row reading it would render again — in the test only.
jest.mock('../../auth/AuthContext', () => {
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

// ── The list reacts to every input ────────────────────────────────────────────
//
// The search, the lens, a pick and a sync that adds, renames or removes an
// artist. Then the render counts: after one change, which rows render again,
// by artistId. As in the list's existing perf scenarios, no timers run after
// the change. The list opens on 3 INCHES OF BLOOD (92), ABBIE FALLS (163),
// ABSU (101); EXORCIZPHOBIA (216) is further down, not mounted at first.

let setScope: (scope: LensScope) => void;
let cycle: (artistId: string) => void;
let search: (query: string) => void;

/** One press of a pick's star, in a render of its own, as a tap would. */
async function press(artistId: string): Promise<void> {
  await act(async () => { cycle(artistId); });
}

/** Cycles a pick `times` times, one press per render. */
async function pressTimes(artistId: string, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await press(artistId);
  }
}

function Controls() {
  setScope = useLens().setScope;
  const { cycleStatus } = useInterestCycle();
  cycle = (artistId) => { cycleStatus(artistId); };
  return null;
}

async function mountList(): Promise<void> {
  await render(<PerfProviders><><Controls /><ArtistListScreen /></></PerfProviders>);
  search = (query) => { screen.getByPlaceholderText('Search artists…').props.onChangeText(query); };
}

async function withPicks(picks: Record<string, 'maybe' | 'will_go'>, run: () => Promise<void>): Promise<void> {
  for (const [artistId, status] of Object.entries(picks)) {
    await setInterest('ba2025', artistId, status);
  }
  await hydrateInterests('ba2025');
  try {
    await run();
  } finally {
    for (const artistId of Object.keys(picks)) {
      await setInterest('ba2025', artistId, 'none');
    }
    await hydrateInterests('ba2025');
  }
}

describe('the list reacts', () => {
  afterEach(async () => {
    syncWith();
    await act(async () => { search(''); });
  });

  it('lists an artist picked after the lens narrowed to my picks', async () => {
    await mountList();
    await act(async () => { setScope({ kind: 'me', level: null }); });
    expect(screen.queryByText('ABSU')).toBeNull();
    // none → Maybe.
    await act(async () => { cycle('101'); });
    expect(screen.getByText('ABSU')).toBeTruthy();
    // Back to none: Must-see, don't go, none — one press per render.
    await pressTimes('101', 3);
  });

  it('follows a sync that renames an artist, adds one and removes one', async () => {
    await mountList();
    await act(async () => {
      syncWith((artists) => [
        ...artists.filter((a) => a.artistId !== '163').map((a) => (a.artistId === '101' ? { ...a, name: 'ABSU (US)' } : a)),
        { ...artists.find((a) => a.artistId === '92')!, artistId: 'new-1', name: '1349' },
      ]);
    });
    expect(screen.getByText('ABSU (US)')).toBeTruthy();
    expect(screen.getByText('1349')).toBeTruthy();
    expect(screen.queryByText('ABBIE FALLS')).toBeNull();
  });

  describe('render counts', () => {
    async function mountCounted(): Promise<void> {
      await mountList();
      resetRenders();
    }

    it('a pick renders only its row', async () => {
      await mountCounted();
      await act(async () => { cycle('163'); });
      expect(rendersSinceReset()).toEqual({ '163': 1 });
      // Back to none: Must-see, don't go, none — one press per render.
      await pressTimes('163', 3);
    });

    it('a search down to one artist renders only that row, newly shown', async () => {
      await mountCounted();
      await act(async () => { search('exorcizphobia'); });
      expect(rendersSinceReset()).toEqual({ '216': 1 });
    });

    it('the lens on my picks renders none of the rows it keeps', async () => {
      await withPicks({ '92': 'maybe', '163': 'will_go' }, async () => {
        await mountCounted();
        await act(async () => { setScope({ kind: 'me', level: null }); });
        expect(screen.getByText('ABBIE FALLS')).toBeTruthy();
        expect(rendersSinceReset()).toEqual({});
      });
    });

    it('a sync that renames one artist renders only its row', async () => {
      await mountCounted();
      await act(async () => {
        syncWith((artists) => artists.map((a) => (a.artistId === '101' ? { ...a, name: 'ABSU (US)' } : a)));
      });
      expect(rendersSinceReset()).toEqual({ '101': 1 });
    });
  });
});
