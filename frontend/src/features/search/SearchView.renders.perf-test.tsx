import React from 'react';
import { measureRenders } from 'reassure';
import { act, fireEvent, type screen as Screen } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { SearchView } from './SearchView';
import { useSearch, useSearchScope } from './SearchContext';
import { useInterestCycle } from '../interests/InterestContext';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../../tests/setup/perfOptions';
import { PROGRAM_LIKE_SCOPE } from '../../../tests/setup/searchScopeStub';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for the search results ──────────────────────────────────────
//
// The search alone, over a Program-like scope: no screen behind it, so every
// commit counted is the search's own. Each run opens the search and types a
// query at once. First the queries alone, so the runs differ only in the list
// each makes (2025 lineup): "g" fills it (110 matches, cut to 30 rows, more
// than a phone screen), "go" has 14, "gojira" GOJIRA's set and the Gojira
// exhibition's four days, "$" nothing ("Nothing found"). Then "gojira" with
// one change more: the next keystroke, the keyboard coming up (the field rises, the list's
// padding follows), a pick on a result, a scroll back to the top (which gives
// the field the keyboard back and renders nothing).
//
// The duration is React's render time of the whole run (mount, open, the
// query), not time to the screen. The computing of the same queries:
// SearchView.model.perf-test.ts.

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../../hooks/useLayoutMode', () => ({
  useLayoutMode: () => ({ isWide: false, isShort: false, contentPadding: 16, bottomClearance: 0, width: 390, height: 844 }),
}));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('../../auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false, isRestoringSession: false, userId: null, email: null, name: null,
    getAccessToken: async () => null, signIn: async () => undefined, signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});

const SLUG = 'ba2025';
const GOJIRA = '7';

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache(SLUG, collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
});

let open: () => void;
let cycle: (artistId: string) => void;

function Controls() {
  useSearchScope(PROGRAM_LIKE_SCOPE);
  open = useSearch().open;
  const { cycleStatus } = useInterestCycle();
  cycle = (artistId) => { cycleStatus(artistId); };
  return null;
}

function Search() {
  return (
    <>
      <Controls />
      <SearchView />
    </>
  );
}

function Wrapper({ children }: { children: React.ReactElement }) {
  return <PerfProviders>{children}</PerfProviders>;
}

type RenderedScreen = typeof Screen;

async function typeQuery(screen: RenderedScreen, query: string): Promise<void> {
  await act(async () => { fireEvent.changeText(screen.getByTestId('search-input'), query); });
}

async function openAndType(screen: RenderedScreen, query = 'gojira'): Promise<void> {
  await act(async () => { open(); });
  await typeQuery(screen, query);
}

const offset = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 390, height: 2000 }, layoutMeasurement: { width: 390, height: 700 } } });

for (const query of ['g', 'go', 'gojira', '$']) {
  test(`search results: typing "${query}"`, async () => {
    await measureRenders(<Search />, {
      ...MEASURE_OPTIONS,
      wrapper: Wrapper,
      scenario: (screen) => openAndType(screen, query),
    });
  });
}

test('search results: the next keystroke', async () => {
  await measureRenders(<Search />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    scenario: async (screen) => {
      await act(async () => { open(); });
      await typeQuery(screen, 'gojir');
      await typeQuery(screen, 'gojira');
    },
  });
});

test('search results: the keyboard comes up', async () => {
  await measureRenders(<Search />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    scenario: async (screen) => {
      await openAndType(screen);
      await act(async () => {
        DeviceEventEmitter.emit('keyboardWillShow', { endCoordinates: { height: 336, screenX: 0, screenY: 508, width: 390 }, duration: 250, easing: 'keyboard' });
      });
    },
  });
});

test('search results: a pick on a result', async () => {
  await measureRenders(<Search />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    // The pick is remembered: every run starts from none.
    beforeEach: async () => {
      await setInterest(SLUG, GOJIRA, 'none');
      await hydrateInterests(SLUG);
    },
    scenario: async (screen) => {
      await openAndType(screen);
      await act(async () => { cycle(GOJIRA); });
    },
  });
  await setInterest(SLUG, GOJIRA, 'none');
  await hydrateInterests(SLUG);
});

test('search results: a scroll back to the top', async () => {
  await measureRenders(<Search />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    scenario: async (screen) => {
      await openAndType(screen);
      await act(async () => { fireEvent(screen.getByTestId('search-results'), 'scrollBeginDrag', offset(400)); });
      await act(async () => { fireEvent(screen.getByTestId('search-results'), 'scrollEndDrag', offset(0)); });
    },
  });
});
