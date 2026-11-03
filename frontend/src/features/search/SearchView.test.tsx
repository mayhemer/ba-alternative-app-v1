import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyboard, TextInput } from 'react-native';
import { SearchView } from './SearchView';
import { BaseTimelineScreen } from '../../screens/timeline/BaseTimelineScreen';
import { ArtistListScreen } from '../../screens/artist-list/ArtistListScreen';
import { MyPlanScreen } from '../../screens/my-plan/MyPlanScreen';
import { PlanFilterChip } from '../../screens/my-plan/filter/PlanFilterChip';
import { PlanFilterPanel } from '../../screens/my-plan/filter/PlanFilterPanel';
import { usePlanFilters } from '../../screens/my-plan/PlanContext';
import { LensPanel } from '../social/LensPanel';
import { LensChip } from '../social/LensChip';
import { useLens } from '../social/LensContext';
import { useArtistDetail } from '../artist-detail/ArtistDetailContext';
import { useSelectedDay, useTimelineFilter } from '../../screens/timeline/TimelineFilterContext';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import { setLensScope } from '../../store/uiStatePersistence';
import { setCurrentTimeMs } from '../../utils/clock';
import { DEFAULT_SCOPE, type LensScope } from '../../lib/interestUtils';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Search, end to end on a screen ────────────────────────────────────────────
//
// Dimensions: the screen it opens on (Program, Artists); the field empty or
// typed; a result in the screen's own section or another; one the lens removes
// (my "don't go" under My picks); how it closes (✕, the dimmed screen, a
// landing, the lens chip). Fixture: the 2025 lineup. GOJIRA plays Thursday on
// the Program (7096); the Gojira exhibition is on the Support Program from
// Wednesday to Saturday (6919–6922); CAR BOMB (artist 90) plays Thursday (7067).

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

// A phone, unless a case says otherwise: the layout the flows below describe.
let mockWide = false;
jest.mock('../../hooks/useLayoutMode', () => ({
  useLayoutMode: () => (mockWide
    ? { isWide: true, isShort: false, contentPadding: 0, bottomClearance: 0, width: 1280, height: 800 }
    : { isWide: false, isShort: false, contentPadding: 16, bottomClearance: 0, width: 390, height: 844 }),
}));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('../../auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false, isRestoringSession: false, userId: null, email: null, name: null,
    getAccessToken: async () => null, signIn: async () => undefined, signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});

const NOW = Date.parse('2025-08-08T16:00:00+02:00');
const THU = Date.parse('2025-08-07T06:00:00+02:00');

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
  await AsyncStorage.clear();
  setLensScope(DEFAULT_SCOPE);
  await hydrateInterests('ba2025');
});

afterAll(() => {
  setCurrentTimeMs(null);
});

let probe: {
  signal: ReturnType<typeof useTimelineFilter>['scrollToTimeSignal'];
  day: number;
  scope: LensScope;
  setScope: (scope: LensScope) => void;
  artist: string | null;
  presentation: string;
};

function Probe() {
  const { scrollToTimeSignal } = useTimelineFilter();
  const day = useSelectedDay();
  const { scope, setScope } = useLens();
  const { detailState } = useArtistDetail();
  probe = { signal: scrollToTimeSignal, day, scope, setScope, artist: detailState.artist?.name ?? null, presentation: detailState.presentation };
  return null;
}

const playable = (a: DbArtist): boolean => a.isPlayable;
const NoBottomBar = (): null => null;

async function renderOn(subject: 'program' | 'artists'): Promise<void> {
  await render(
    <PerfProviders>
      <>
        {subject === 'program'
          ? <BaseTimelineScreen title="Program" screenKey="timeline" BottomBarComponent={NoBottomBar} filterArtist={playable} />
          : <ArtistListScreen />}
        <LensChip />
        <LensPanel />
        <SearchView />
        <Probe />
      </>
    </PerfProviders>,
  );
}

async function openSearch(): Promise<void> {
  await act(async () => { fireEvent.press(screen.getByLabelText('View and share schedules')); });
  await act(async () => { fireEvent.press(screen.getByTestId('search-entry')); });
}

async function type(query: string): Promise<void> {
  await act(async () => { fireEvent.changeText(screen.getByTestId('search-input'), query); });
}

describe('search on the Program', () => {
  afterEach(async () => {
    await setInterest('ba2025', '90', 'none');
  });

  it('opens from the lens panel, which closes behind it; empty, it only dims the screen', async () => {
    await renderOn('program');
    await openSearch();
    expect(screen.getByTestId('search-input')).toBeTruthy();
    expect(screen.queryByText('Show')).toBeNull();
    expect(screen.getByTestId('search-dim')).toBeTruthy();
    expect(screen.queryByTestId('search-results')).toBeNull();
  });

  it('closes on a tap on the dimmed screen', async () => {
    await renderOn('program');
    await openSearch();
    await act(async () => { fireEvent.press(screen.getByTestId('search-dim')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
  });

  it('closes on ✕, typed or not', async () => {
    await renderOn('program');
    await openSearch();
    await type('goj');
    await act(async () => { fireEvent.press(screen.getByTestId('search-close')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
  });

  it('lists the Program\'s sets first, the Support Program\'s under where they are', async () => {
    await renderOn('program');
    await openSearch();
    await type('gojira');
    expect(screen.queryByTestId('search-dim')).toBeNull();
    expect(screen.getByText('Program')).toBeTruthy();
    expect(screen.getByText('In the Support Program')).toBeTruthy();
    expect(screen.getByText('opens there')).toBeTruthy();
    ['7096', '6919', '6920', '6921', '6922'].forEach((id) => { expect(screen.getByTestId(`search-row-${id}`)).toBeTruthy(); });
  });

  it('lands on a band\'s set: closes, selects its day, scrolls to it and names it', async () => {
    await renderOn('program');
    await openSearch();
    await type('gojira');
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-7096')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
    expect(probe.day).toBe(THU);
    expect(probe.signal).toMatchObject({ screenKey: 'timeline', eventId: '7096' });
  });

  it('takes a support set to the Support Program, at it', async () => {
    await renderOn('program');
    await openSearch();
    await type('gojira');
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-6920')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
    expect(probe.signal).toMatchObject({ screenKey: 'support', eventId: '6920' });
  });

  it('under My picks, tags my "don\'t go" band and turns the lens to Everything to land on it', async () => {
    await setInterest('ba2025', '90', 'dont_go');
    await hydrateInterests('ba2025');
    await renderOn('program');
    await act(async () => { probe.setScope({ kind: 'me', level: null }); });
    await openSearch();
    await type('car bomb');
    expect(screen.getByText('Lens → Everything')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-7067')); });
    expect(probe.scope).toEqual({ kind: 'all' });
    expect(probe.signal).toMatchObject({ screenKey: 'timeline', eventId: '7067' });
  });

  it('on a wide screen keeps the rest dimmed beside the results, and a tap there closes it', async () => {
    mockWide = true;
    try {
      await renderOn('program');
      await openSearch();
      await type('gojira');
      expect(screen.getByTestId('search-results')).toBeTruthy();
      await act(async () => { fireEvent.press(screen.getByTestId('search-dim')); });
      expect(screen.queryByTestId('search-input')).toBeNull();
    } finally {
      mockWide = false;
    }
  });

  it('closes when the lens chip is tapped, and the panel opens', async () => {
    await renderOn('program');
    await openSearch();
    await act(async () => { fireEvent.press(screen.getByLabelText('View and share schedules')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
    expect(screen.getByText('Show')).toBeTruthy();
  });
});

describe('the field at the bottom edge', () => {
  const at = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 390, height: 2000 }, layoutMeasurement: { width: 390, height: 700 } } });

  async function scrollResults(event: 'scrollBeginDrag' | 'scrollEndDrag' | 'momentumScrollEnd', y: number): Promise<void> {
    await act(async () => { fireEvent(screen.getByTestId('search-results'), event, at(y)); });
  }

  it('gives the field the keyboard back when the results are dragged back to the top', async () => {
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    await renderOn('program');
    await openSearch();
    await type('gojira');
    await scrollResults('scrollBeginDrag', 400);
    await scrollResults('scrollEndDrag', 0);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('and when a fling toward the top comes to rest at it', async () => {
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    await renderOn('program');
    await openSearch();
    await type('gojira');
    await scrollResults('scrollBeginDrag', 400);
    await scrollResults('scrollEndDrag', 250);
    expect(focus).not.toHaveBeenCalled();
    await scrollResults('momentumScrollEnd', 0);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('not when the scroll rests below the top, nor for the drag that starts at it', async () => {
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    await renderOn('program');
    await openSearch();
    await type('gojira');
    await scrollResults('scrollBeginDrag', 400);
    await scrollResults('scrollEndDrag', 120);
    await scrollResults('momentumScrollEnd', 80);
    await scrollResults('scrollBeginDrag', 0);
    await scrollResults('scrollEndDrag', 0);
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('search on Artists', () => {
  it('opens the artist sheet expanded over the results, which stay, and puts the keyboard away', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    await renderOn('artists');
    await openSearch();
    await type('gojira');
    expect(screen.getByText('Bands')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-7096')); });
    expect(probe.artist).toBe('GOJIRA');
    expect(probe.presentation).toBe('expanded');
    expect(dismiss).toHaveBeenCalled();
    expect(screen.getByTestId('search-input')).toBeTruthy();
  });
});

// My plan on Friday 16:00, filter Must-see only. Picks: DARK FUNERAL (79)
// Must-see, Saturday night (7205); DARK ANGEL (22) Maybe, Wednesday (7034).
// DOUBLE DARKNESS (7100) is a band nobody picked; the meet & greets (7035,
// 7206) and the drum clinic (6998) are unpicked support sets.

let planLevel = '';

function PlanProbe() {
  planLevel = usePlanFilters().level;
  return null;
}

describe('search on My plan', () => {
  beforeEach(async () => {
    await setInterest('ba2025', '79', 'will_go');
    await setInterest('ba2025', '22', 'maybe');
    await hydrateInterests('ba2025');
  });

  afterEach(async () => {
    await setInterest('ba2025', '79', 'none');
    await setInterest('ba2025', '22', 'none');
    await hydrateInterests('ba2025');
  });

  async function renderPlan(): Promise<void> {
    await render(
      <PerfProviders>
        <>
          <MyPlanScreen />
          <PlanFilterChip />
          <PlanFilterPanel />
          <SearchView />
          <Probe />
          <PlanProbe />
        </>
      </PerfProviders>,
    );
    await act(async () => {
      fireEvent(screen.getByTestId('plan-screen'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
    });
  }

  async function openFromFilters(): Promise<void> {
    await act(async () => { fireEvent.press(screen.getByLabelText('Filters')); });
    await act(async () => { fireEvent.press(screen.getByTestId('search-entry')); });
  }

  it('lists the sets the plan can show, tagged with the filter they need, the rest by where they are', async () => {
    await renderPlan();
    await openFromFilters();
    await type('dark');
    expect(screen.getByText('My plan')).toBeTruthy();
    expect(screen.getByText('Filter → Must-see and Maybe')).toBeTruthy();
    expect(screen.getByText('Filter → All sets')).toBeTruthy();
    expect(screen.getByText('In the Support Program')).toBeTruthy();
    ['7205', '7034', '7100', '7035', '7206', '6998'].forEach((id) => { expect(screen.getByTestId(`search-row-${id}`)).toBeTruthy(); });
  });

  it('widens the filter to land on a Maybe, on its day, and lights its row', async () => {
    await renderPlan();
    await openFromFilters();
    await type('dark angel');
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-7034')); });
    expect(screen.queryByTestId('search-input')).toBeNull();
    expect(planLevel).toBe('maybe');
    expect(screen.getByText('DARK ANGEL')).toBeTruthy();
    // Lit once the landing scroll has settled.
    expect(await screen.findByTestId('landing-ring')).toBeTruthy();
  });

  it('opens the sheet expanded for a support set over the results, which stay', async () => {
    await renderPlan();
    await openFromFilters();
    await type('dark');
    await act(async () => { fireEvent.press(screen.getByTestId('search-row-7035')); });
    expect(probe.artist).toBe('M&G - DARK ANGEL');
    expect(probe.presentation).toBe('expanded');
    expect(screen.getByTestId('search-input')).toBeTruthy();
  });
});
