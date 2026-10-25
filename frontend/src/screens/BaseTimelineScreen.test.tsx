import React from 'react';
import { AppState, ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { DaySwitcher } from '../components/timeline/DaySwitcher';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { useLens } from '../context/LensContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { createDataCollector, getCategories, hydrateInterests, populateCache, setInterest } from '../cache/cacheService';
import { getScroll, setHiddenCategories, setLensScope, setSelectedDay } from '../store/uiStatePersistence';
import { defaultScrollX, eventScrollTarget } from '../components/timeline/timelineLayout';
import { setCurrentTimeMs } from '../utils/clock';
import { DEFAULT_SCOPE, type LensScope } from '../utils/interestUtils';
import { getCategoryLocalized } from '../utils/localization';
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

// ── What the timeline draws ───────────────────────────────────────────────────
//
// The style values the screen hands to its blocks, lanes and lane titles: where
// each one is drawn and how big. Jest lays nothing out, so this is the only
// layer that sees these numbers for every element; the web E2E measures a few of
// them in a real browser. Expected values are worked out by hand from the
// fixture's times: 170 px per hour from the day's 06:00, a lane 70 tall (68 for
// the block, less the lane's 2 px border), a 32 px title strip above it.

type Style = Record<string, unknown>;

const styleOf = (node: TestInstance): Style => (StyleSheet.flatten(node.props.style) ?? {}) as Style;

/** The nearest host View above `node` whose style passes `test`. */
function viewAbove(node: TestInstance, test: (style: Style) => boolean): TestInstance {
  for (let n: TestInstance | null = node.parent; n !== null; n = n.parent) {
    if (n.type === 'View' && test(styleOf(n))) {
      return n;
    }
  }
  throw new Error('no such view above the node');
}

/** Every node below `node` that passes `test`. */
function nodesBelow(node: TestInstance, test: (n: TestInstance) => boolean): TestInstance[] {
  const found: TestInstance[] = [];
  for (const child of node.children) {
    if (typeof child !== 'string') {
      if (test(child)) {
        found.push(child);
      }
      found.push(...nodesBelow(child, test));
    }
  }
  return found;
}

const isBlockBox = (s: Style): boolean => s.position === 'absolute' && typeof s.width === 'number' && typeof s.height === 'number';

/** A block's box: the absolute view sized by time. */
function blockOf(name: string): Style {
  return styleOf(viewAbove(screen.getAllByText(name)[0], isBlockBox));
}

/** A block's events row: the lane's own view, with the 2 px bottom border. */
function laneOf(name: string): Style {
  return styleOf(viewAbove(screen.getAllByText(name)[0], (s) => s.borderBottomWidth === 2 && typeof s.height === 'number'));
}

/** A lane title's box, in the overlay beside the scroller. */
function titleOf(title: string): Style {
  return styleOf(viewAbove(screen.getByText(title), (s) => s.position === 'absolute' && typeof s.top === 'number'));
}

/** Each conflict bar over a block, as [left, width]: the striped boxes hung from its bottom edge. */
function barsOf(name: string): [unknown, unknown][] {
  const block = viewAbove(screen.getAllByText(name)[0], isBlockBox);
  return nodesBelow(block, (n) => typeof n.props.width === 'number' && styleOf(n).bottom === -1)
    .filter((n) => n.type !== 'View')
    .map((n) => [styleOf(n).left, n.props.width]);
}

/**
 * Mounts the whole day. Under Jest each act() lets the progressive mount grow by
 * one slice, so a wide day takes several; this goes on until the number of
 * blocks stops changing.
 */
async function settleWholeDay(): Promise<void> {
  let blocks = -1;
  for (let i = 0; i < 20; i++) {
    await settle();
    const now = screen.queryAllByText(/^[0-9]{2}:[0-9]{2}–[0-9]{2}:[0-9]{2}$/).length;
    if (now === blocks) {
      return;
    }
    blocks = now;
  }
  throw new Error('the day never finished mounting');
}

const TUE = WED - DAY_MS;
const PX_PER_MIN = 170 / 60;
const titleOfCategory = (categoryId: string): string =>
  getCategoryLocalized((categoriesFixture as unknown as DbCategory[]).find((c) => c.categoryId === categoryId)!.localized, 'title');

async function mountScreen(screenKey: string, day: number, filterArtist: (a: DbArtist) => boolean, useSubRows = false) {
  setSelectedDay(screenKey, day);
  await render(
    <PerfProviders>
      <>
        <Controls />
        <BaseTimelineScreen
          title="Timeline"
          screenKey={screenKey}
          BottomBarComponent={NoBottomBar}
          filterArtist={filterArtist}
          useSubRows={useSubRows}
        />
      </>
    </PerfProviders>,
  );
  await settleWholeDay();
}

describe('what the timeline draws', () => {
  // Wednesday's Program has five lanes, in category order: Marshall, Sea
  // Shepherd, Obscure, KAL stage, Octagon. Each takes 32 + 70 = 102.
  it('draws a set at its time, as long as it lasts, in its lane', async () => {
    await mountScreen('net-block', WED, playable);
    // EXORCIZPHOBIA, Obscure, 14:30–15:05: 8 h 30 after 06:00, 35 minutes long.
    const block = blockOf('EXORCIZPHOBIA');
    expect(block.left).toBeCloseTo(8.5 * 170);
    expect(block.width).toBeCloseTo(35 * PX_PER_MIN);
    expect(block.top).toBe(0);
    expect(block.height).toBe(68);
    expect(laneOf('EXORCIZPHOBIA').height).toBe(70);
  });

  it('draws a set after midnight on the day it belongs to, past the 24:00 mark', async () => {
    await mountScreen('net-night', WED, playable);
    const block = blockOf('THRASH COBRA');
    expect(block.left).toBeCloseTo(18.5 * 170);
    expect(block.width).toBeCloseTo(45 * PX_PER_MIN);
  });

  it('stacks the lane titles, each on its own lane', async () => {
    await mountScreen('net-titles', WED, playable);
    expect([titleOf('Marshall'), titleOf('Sea Shepherd'), titleOf('Obscure'), titleOf('KAL stage'), titleOf('Octagon')]
      .map((t) => [t.top, t.height])).toEqual([[0, 32], [102, 32], [204, 32], [306, 32], [408, 32]]);
  });

  it('draws a conflict bar over just the overlapping part of each clashing Must-see', async () => {
    // CRYSTAL LAKE (Sea Shepherd, 14:00–14:40) and EXORCIZPHOBIA (14:30–15:05)
    // overlap 14:30–14:40.
    await setInterest('ba2025', '35', 'will_go');
    await setInterest('ba2025', '216', 'will_go');
    await hydrateInterests('ba2025');
    try {
      await mountScreen('net-bars', WED, playable);
      const [[crystalLeft, crystalWidth], ...moreCrystal] = barsOf('CRYSTAL LAKE');
      const [[exorLeft, exorWidth], ...moreExor] = barsOf('EXORCIZPHOBIA');
      expect([moreCrystal, moreExor]).toEqual([[], []]);
      // 30 minutes into CRYSTAL LAKE; at EXORCIZPHOBIA's very start; 10 minutes each.
      expect(crystalLeft).toBeCloseTo(30 * PX_PER_MIN);
      expect(crystalWidth).toBeCloseTo(10 * PX_PER_MIN);
      expect(exorLeft).toBe(0);
      expect(exorWidth).toBeCloseTo(10 * PX_PER_MIN);
    } finally {
      await setInterest('ba2025', '35', 'none');
      await setInterest('ba2025', '216', 'none');
      await hydrateInterests('ba2025');
    }
  });

  // Tuesday's Support Program: Meet & Greet (category 6), the exhibitions
  // (7: KUNDY CREW and ART-BRUT-ALL, both 13:00–01:00, so two rows), the pit
  // (8) and the museum (9).
  it('stacks overlapping support sets in rows, the lane as tall as its rows', async () => {
    await mountScreen('net-support', TUE, (a) => !a.isPlayable, true);
    expect(laneOf('KUNDY CREW').height).toBe(140);
    expect(blockOf('KUNDY CREW').top).toBe(0);
    expect(blockOf('ART-BRUT-ALL').top).toBe(70);
    // 13:00 is 7 h after 06:00; twelve hours long.
    expect(blockOf('ART-BRUT-ALL').left).toBeCloseTo(7 * 170);
    expect(blockOf('ART-BRUT-ALL').width).toBeCloseTo(12 * 170);
    expect(laneOf('PIT OF DOOM').height).toBe(70);
    // The titles below the two-row lane move down by its extra row.
    expect([titleOfCategory('6'), titleOfCategory('7'), titleOfCategory('8'), titleOfCategory('9')].map((t) => titleOf(t).top))
      .toEqual([0, 102, 274, 376]);
  });
});

// ── Rows from the sets shown ──────────────────────────────────────────────────
//
// A lane stacks only the sets it shows: one hidden by the lens takes no row.
// On Tuesday the exhibitions KUNDY CREW and ART-BRUT-ALL (both 13:00–01:00)
// need two rows; with only ART-BRUT-ALL picked and the lens on "My picks", the
// lane shows one set, in one row.

describe('rows from the sets shown', () => {
  it('lays a lane out for the sets the lens shows, not for all of them', async () => {
    await setInterest('ba2025', '219', 'maybe');
    await hydrateInterests('ba2025');
    try {
      await mountScreen('rows-shown', TUE, (a) => !a.isPlayable, true);
      await act(async () => { setScope({ kind: 'me', level: null }); });
      await settleWholeDay();
      expect(screen.queryByText('KUNDY CREW')).toBeNull();
      expect(laneOf('ART-BRUT-ALL').height).toBe(70);
      expect(blockOf('ART-BRUT-ALL').top).toBe(0);
    } finally {
      await setInterest('ba2025', '219', 'none');
      await hydrateInterests('ba2025');
    }
  });
});

// ── "Now" follows the minute clock ────────────────────────────────────────────
//
// The ruler's now line, the lanes' and the today notch on the day buttons all
// follow the shared minute clock (useMinuteNow), as My plan does: "now" floored
// to the minute, a tick on each minute boundary, and one more when the app comes
// back to the foreground, where timers stalled while the phone was locked.

/** Where the ruler's now line is drawn: its live animated left. */
function nowLineX(): number {
  const line = screen.getByTestId('now-line');
  return (line.props.jestAnimatedStyle?.value?.left ?? StyleSheet.flatten(line.props.style).left) as number;
}

async function minuteTo(time: number, advanceMs: number): Promise<void> {
  setCurrentTimeMs(time);
  await act(async () => { await jest.advanceTimersByTimeAsync(advanceMs); });
}

describe('now', () => {
  afterEach(() => { setCurrentTimeMs(NOW); });

  it('draws the now line at the current minute', async () => {
    setCurrentTimeMs(Date.parse('2025-08-06T14:00:30+02:00'));
    await mountScreen('now-minute', WED, playable);
    // 14:00 is 8 h after 06:00.
    expect(nowLineX()).toBeCloseTo(8 * 170);
  });

  it('moves the now line on the minute boundary', async () => {
    setCurrentTimeMs(Date.parse('2025-08-06T14:00:30+02:00'));
    await mountScreen('now-tick', WED, playable);
    // The next minute starts 30 s after the mount.
    await minuteTo(Date.parse('2025-08-06T14:01:00+02:00'), 30 * 1000);
    expect(nowLineX()).toBeCloseTo(8 * 170 + 170 / 60);
  });

  it('moves the now line when the app comes back to the foreground', async () => {
    const appState = jest.spyOn(AppState, 'addEventListener');
    setCurrentTimeMs(Date.parse('2025-08-06T14:00:00+02:00'));
    await mountScreen('now-foreground', WED, playable);
    // Locked for an hour and a half: no timer fired, then the app is active again.
    setCurrentTimeMs(Date.parse('2025-08-06T15:30:00+02:00'));
    await act(async () => {
      for (const [type, listener] of appState.mock.calls) {
        if (type === 'change') {
          (listener as (state: string) => void)('active');
        }
      }
    });
    appState.mockRestore();
    // 15:30 is 9 h 30 after 06:00.
    expect(nowLineX()).toBeCloseTo(9.5 * 170);
  });

  it("moves the day buttons' today notch to the next day at 06:00", async () => {
    const THU_DAY = WED + DAY_MS;
    const FRI_DAY = THU_DAY + DAY_MS;
    setCurrentTimeMs(Date.parse('2025-08-08T05:59:00+02:00'));
    await render(<PerfProviders><DaySwitcher screenKey="now-notch" /></PerfProviders>);
    expect(screen.queryByTestId(`day-today-${THU_DAY}`)).not.toBeNull();
    await minuteTo(Date.parse('2025-08-08T06:00:00+02:00'), 60 * 1000);
    expect(screen.queryByTestId(`day-today-${THU_DAY}`)).toBeNull();
    expect(screen.queryByTestId(`day-today-${FRI_DAY}`)).not.toBeNull();
  });
});
