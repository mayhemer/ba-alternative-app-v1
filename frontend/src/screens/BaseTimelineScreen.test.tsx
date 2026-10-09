import React from 'react';
import { ScrollView } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { useLens } from '../context/LensContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { createDataCollector, getCategories, populateCache } from '../cache/cacheService';
import { getScroll, setHiddenCategories, setLensScope, setSelectedDay } from '../store/uiStatePersistence';
import { defaultScrollX, eventScrollTarget } from '../components/timeline/timelineLayout';
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

// Records every loading caption painted, so a case can prove the timeline never
// showed one — a frame that commits and is replaced inside the same act() would
// otherwise be invisible to a query.
const mockLoadingShown: string[] = [];

jest.mock('../components/ui/LoadingScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    LoadingScreen: ({ message }: { message: string }) => {
      mockLoadingShown.push(message);
      return <Text>{message}</Text>;
    },
  };
});

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
let setSelectedDayStart: (day: number) => void;
let requestScrollToTime: (screenKey: string, fromMs: number, toMs: number, categoryId?: string) => void;
let requestScrollToNow: (screenKey: string) => void;

function Controls() {
  setScope = useLens().setScope;
  ({ toggleCategory, setSelectedDayStart, requestScrollToTime, requestScrollToNow } = useTimelineFilter());
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

it('opens straight on the day, with no loading frame first', async () => {
  mockLoadingShown.length = 0;

  await mount('edge-no-loading');

  expect(screen.getByText(LANE_TITLE)).toBeTruthy();
  expect(mockLoadingShown).toEqual([]);
});

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

// ── Where the timeline is scrolled to ─────────────────────────────────────────
//
// Jest lays nothing out and moves no scroller, so these pin the commands: the
// offset the horizontal scroller mounts at (`contentOffset`) and every scrollTo
// issued to either scroller afterwards. Whether a scroller then really lands
// there — clamping, real layout — is for tests/e2e/timeline.spec.ts (web) and
// e2e/native (iOS) to show. User scrolls go through the view's real onScroll
// handler, so what gets remembered is decided by the app's own persist path.
// Expected offsets come from the same timelineLayout functions the app uses
// (unit-tested in timelineLayout.test.ts), fed with the fixture schedule.

const DAY_MS = 24 * 60 * 60 * 1000;
const THU = WED + DAY_MS;

const ARTISTS = artistsFixture as unknown as DbArtist[];
const EVENTS = scheduleFixture as unknown as DbEvent[];
const PLAYABLE = new Set(ARTISTS.filter(playable).map((a) => a.artistId));

/** The day's sets on this screen, in start order. */
function setsOn(day: number): DbEvent[] {
  return EVENTS
    .filter((e) => PLAYABLE.has(e.artistId) && e.dateFrom >= day && e.dateFrom < day + DAY_MS)
    .sort((a, b) => a.dateFrom - b.dateFrom);
}

const SCROLL_X = 'timeline-scroll-x';
const SCROLL_Y = 'timeline-scroll-y';

type ScrollCommand = { x?: number; y?: number; animated?: boolean };

/**
 * Every scrollTo issued to the scroller with this testID, oldest first. React
 * Native's Jest mock puts a single jest.fn on the ScrollView prototype, shared by
 * every instance; the call's `this` tells them apart.
 */
function scrollCommands(testID: string): ScrollCommand[] {
  const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);
  return scrollTo.mock.calls
    .filter((_, i) => (scrollTo.mock.contexts[i] as ScrollView).props.testID === testID)
    .map(([options]) => options as ScrollCommand);
}

function clearScrollCommands(): void {
  jest.mocked(ScrollView.prototype.scrollTo).mockClear();
}

/** A scroll event from the horizontal scroller, as a drag or a landing reports it. */
async function scrollTimelineTo(x: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(SCROLL_X), { nativeEvent: { contentOffset: { x, y: 0 } } });
}

/**
 * Switches the day, then reports back the offset it was restored to — what the
 * real scroller does once it lands — so the view's idea of where it is stays true
 * for the next switch.
 */
async function switchDay(day: number): Promise<ScrollCommand> {
  clearScrollCommands();
  await act(async () => { setSelectedDayStart(day); });
  await settle();
  const commands = scrollCommands(SCROLL_X);
  expect(commands).toHaveLength(1);
  await scrollTimelineTo(commands[0].x!);
  return commands[0];
}

it('opens a day a quarter of an hour before its first set', async () => {
  await mount('scroll-default');

  const x = defaultScrollX(setsOn(WED)[0].dateFrom, WED);
  expect(x).toBeGreaterThan(0);
  expect(screen.getByTestId(SCROLL_X).props.contentOffset).toEqual({ x, y: 0 });
  // The deferred first-mount restore — web's path, since react-native-web ignores
  // contentOffset — aims at the same place.
  expect(scrollCommands(SCROLL_X)).toEqual([{ x, animated: false }]);
});

it('reopens a day where it was left', async () => {
  const first = await mount('scroll-remount');
  await scrollTimelineTo(2000);
  await first.unmount();
  clearScrollCommands();

  await mount('scroll-remount');

  expect(screen.getByTestId(SCROLL_X).props.contentOffset).toEqual({ x: 2000, y: 0 });
  expect(scrollCommands(SCROLL_X)).toEqual([{ x: 2000, animated: false }]);
});

it('keeps each day\'s own position across day switches', async () => {
  await mount('scroll-days');
  await scrollTimelineTo(2000);

  // Thursday was never scrolled: it opens at its own first set, not at
  // Wednesday's offset.
  expect(await switchDay(THU)).toEqual({ x: defaultScrollX(setsOn(THU)[0].dateFrom, THU), animated: false });
  await scrollTimelineTo(3000);

  expect(await switchDay(WED)).toEqual({ x: 2000, animated: false });
  expect(await switchDay(THU)).toEqual({ x: 3000, animated: false });
  expect(getScroll('scroll-days', WED)).toBe(2000);
  expect(getScroll('scroll-days', THU)).toBe(3000);
});

it('the now button scrolls to the current time and leaves the lane alone', async () => {
  await mount('scroll-now');
  await fireEvent(screen.getByTestId(SCROLL_X), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } } });
  clearScrollCommands();

  await act(async () => { requestScrollToNow('scroll-now'); });
  await settle();

  const { x } = eventScrollTarget({
    fromMs: NOW, toMs: NOW, dayStartMs: WED, viewportWidth: 400, lane: undefined, areaHeight: 0, bottomClearance: 0,
  });
  expect(scrollCommands(SCROLL_X)).toEqual([{ x, animated: true }]);
  expect(scrollCommands(SCROLL_Y)).toEqual([]);
});

it('going to a set scrolls to its time and its lane', async () => {
  await mount('scroll-jump');
  await fireEvent(screen.getByTestId(SCROLL_X), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } } });
  clearScrollCommands();

  // The day's last set: far right of where the day opens, and not in the top lane.
  const set = setsOn(WED).at(-1)!;
  await act(async () => { requestScrollToTime('scroll-jump', set.dateFrom, set.dateTo, set.categoryId); });
  await settle();

  const { x } = eventScrollTarget({
    fromMs: set.dateFrom, toMs: set.dateTo, dayStartMs: WED, viewportWidth: 400, lane: undefined, areaHeight: 0, bottomClearance: 0,
  });
  expect(x).toBeGreaterThan(defaultScrollX(setsOn(WED)[0].dateFrom, WED));
  expect(scrollCommands(SCROLL_X)).toEqual([{ x, animated: true }]);
  // The exact lane offset is layout (fixtureLayout.test.ts); here, that it moves.
  expect(scrollCommands(SCROLL_Y)).toEqual([{ y: expect.any(Number), animated: true }]);
  expect(scrollCommands(SCROLL_Y)[0].y).toBeGreaterThan(0);
});
