import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { useLens } from '../context/LensContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { createDataCollector, getCategories, populateCache } from '../cache/cacheService';
import { getScroll, setHiddenCategories, setLensScope, setSelectedDay } from '../store/uiStatePersistence';
import { setCurrentTimeMs } from '../utils/clock';
import { DEFAULT_SCOPE, type LensScope } from '../utils/interestUtils';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── The timeline in its empty states ──────────────────────────────────────────
//
// A day can end up with nothing on it: the lens narrowed to picks there are none
// of yet, or every lane hidden. Each case must still render a usable screen, and
// the empty day must not leave a scroll position behind — the one it would store
// is the 08:30 fallback, which would then outrank the derived landing position
// once the day has events again (see TimelineView's persist guard).
//
// Each case uses its own screenKey, so the persisted UI state (module-level)
// cannot leak between them.

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

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const NOW = Date.parse('2025-08-06T12:00:00+02:00');

// A main-programme lane on Wednesday, and a set on it.
const LANE_TITLE = 'Marshall';

const playable = (a: DbArtist): boolean => a.isPlayable;
const NoBottomBar = (): null => null;

beforeAll(() => {
  setCurrentTimeMs(NOW);
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), NOW);
});

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  // The lens remembers its scope (module state, read when the provider is
  // created); start every case from "everything".
  await AsyncStorage.clear();
  setLensScope(DEFAULT_SCOPE);
  setCurrentTimeMs(NOW);
});

afterEach(() => {
  setHiddenCategories([]);
  jest.useRealTimers();
});

afterAll(() => {
  setCurrentTimeMs(null);
});

/** Runs the progressive mount to completion. */
async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

let setScope: (scope: LensScope) => void;
let toggleCategory: (categoryId: string) => void;

function Controls() {
  setScope = useLens().setScope;
  toggleCategory = useTimelineFilter().toggleCategory;
  return null;
}

async function mount(screenKey: string) {
  setSelectedDay(screenKey, WED);
  const view = await render(
    <PerfProviders>
      <>
        <Controls />
        <BaseTimelineScreen
          title="Program"
          screenKey={screenKey}
          BottomBarComponent={NoBottomBar}
          filterArtist={playable}
        />
      </>
    </PerfProviders>,
  );
  await settle();
  return view;
}

it('remembers where a day with events was left (control for the guard below)', async () => {
  const view = await mount('edge-control');
  expect(screen.getByText(LANE_TITLE)).toBeTruthy();

  await view.unmount();

  expect(getScroll('edge-control', WED)).toBeDefined();
});

it('renders an empty day when the lens has nothing to show, and does not remember its position', async () => {
  const view = await mount('edge-empty-lens');
  expect(screen.getByText(LANE_TITLE)).toBeTruthy();

  // "My picks" with nothing starred.
  await act(async () => { setScope({ kind: 'me', level: null }); });
  await settle();
  expect(screen.queryByText(LANE_TITLE)).toBeNull();

  // Leaving the screen persists the position — except for a day with nothing on it.
  await view.unmount();

  expect(getScroll('edge-empty-lens', WED)).toBeUndefined();
});

it('renders with every lane hidden', async () => {
  await mount('edge-all-hidden');
  expect(screen.getByText(LANE_TITLE)).toBeTruthy();

  await act(async () => {
    for (const category of getCategories('ba2025')) {
      toggleCategory(category.categoryId);
    }
  });
  await settle();

  expect(screen.queryByText(LANE_TITLE)).toBeNull();
  // Still the timeline, not its loading state.
  expect(screen.queryByText('Loading schedule…')).toBeNull();
});
