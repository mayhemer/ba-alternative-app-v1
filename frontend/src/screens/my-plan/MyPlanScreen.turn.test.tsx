import React from 'react';
import { FlatList, Platform, ScrollView } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { MyPlanScreen } from './MyPlanScreen';
import { PlanProvider, usePlanStore } from './PlanContext';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { createDataCollector, populateCache, setInterest } from '../../cache/cacheService';
import { setCurrentTimeMs } from '../../utils/clock';
import { setPlanFilters } from '../../store/uiStatePersistence';
import type { LayoutMode } from '../../hooks/useLayoutMode';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

// ── Turning the phone keeps the time My plan shows ────────────────────────────
//
// My plan keeps one time per day: the time curve at the list's middle line,
// the time at the landscape timeline's centre line (planTimeCurve, TimelineView).
// Both land on it; only a day's own landing, a request, a pinch or the user's
// own scroll changes it. So turning back and forth without scrolling lands each
// view in the same place every time, whatever passing sizes a turn lays the
// screen out at, and a scroll the user ends in one view is where the other
// lands. Dimensions:
//   turns           — several in a row, with a passing size on the way;
//   a scroll        — none, an event alone (a relayout's), the user's drag's end;
//   where           — the list, the timeline.
//
// Jest lays nothing out and moves no scroller: layout and scroll events are
// fired as the native views would send them, and the scrolls the screen issues
// are read where they are sent: the list's scrollToOffset, the timeline's
// scrollTo on React Native's ScrollView mock.
//
// Thursday at 19:23, Must-see only: nine sets from 14:00 to 23:40 with breaks
// between most, Gojira 19:00 live; on a 700 pt list (portrait: taller than
// wide) that is longer than the screen.

const mockLayout: { current: LayoutMode } = {
  current: { isWide: false, isShort: false, contentPadding: 16, bottomClearance: 0, width: 402, height: 874 },
};
const mockListeners = new Set<() => void>();
jest.mock('../../hooks/useLayoutMode', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const subscribe = (listener: () => void): (() => void) => {
    mockListeners.add(listener);
    return () => { mockListeners.delete(listener); };
  };
  return { useLayoutMode: () => useSyncExternalStore(subscribe, () => mockLayout.current) };
});

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'turntest' };
});

jest.mock('../../auth/AuthContext', () => ({
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

const PORTRAIT: LayoutMode = { isWide: false, isShort: false, contentPadding: 16, bottomClearance: 0, width: 402, height: 874 };
const LANDSCAPE: LayoutMode = { isWide: false, isShort: true, contentPadding: 16, bottomClearance: 80, width: 874, height: 402 };

const SLUG = 'turntest';
const at = (hm: string): number => Date.parse(`2025-08-07T${hm}:00+02:00`);

function artist(artistId: string, name: string): DbArtist {
  return { slug: SLUG, artistId, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function event(artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId: `e${artistId}`, dateFrom: at(from), dateTo: at(to), artistId, stageId: 's1', categoryId: 'c1' };
}

const PICKS: [string, string, string][] = [
  ['hooded', '14:00', '14:40'],
  ['crypta', '15:00', '15:40'],
  ['sylosis', '16:00', '16:40'],
  ['carcass', '17:00', '17:40'],
  ['gojira', '19:00', '20:00'],
  ['batushka', '19:40', '20:30'],
  ['ulcerate', '21:00', '21:45'],
  ['mgla', '22:00', '22:40'],
  ['emperor', '23:00', '23:40'],
];

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  mockLayout.current = PORTRAIT;
  setCurrentTimeMs(at('19:23'));
  setPlanFilters({ level: 'must' });
  const collector = createDataCollector();
  collector.setArtists(PICKS.map(([id]) => artist(id, id.toUpperCase())));
  collector.setCategories([{ slug: SLUG, categoryId: 'c1', color: 0x445566, localized: [] } as DbCategory]);
  collector.setStages([{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] } as DbStage]);
  collector.setEvents(PICKS.map(([id, from, to]) => event(id, from, to)));
  populateCache(SLUG, collector.build(), at('09:00'));
  for (const [id] of PICKS) {
    await setInterest(SLUG, id, 'will_go');
  }
  jest.mocked(ScrollView.prototype.scrollTo).mockClear();
  listScrolls.length = 0;
});

// Every offset the list is sent to, oldest first.
const listScrolls: number[] = [];
beforeAll(() => {
  jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(function record(this: FlatList, { offset }: { offset: number }) {
    if (this.props.testID === 'plan-list') {
      listScrolls.push(offset);
    }
  });
});

afterEach(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

type ScrollCommand = { x?: number; y?: number; animated?: boolean };
type MockScrollView = { props: { testID?: string }; scrollTo: (options: ScrollCommand) => void };

/** Where the scroller with this testID was last sent. */
function lastScroll(testID: string, axis: 'x' | 'y'): number | undefined {
  const scrollTo = jest.mocked((ScrollView.prototype as MockScrollView).scrollTo);
  const calls = scrollTo.mock.calls.filter((_, i) => (scrollTo.mock.contexts[i] as MockScrollView).props.testID === testID);
  return calls.at(-1)?.[0][axis];
}
const listAt = (): number | undefined => listScrolls.at(-1);
const timelineAt = (): number | undefined => lastScroll('timeline-scroll-x', 'x');

async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

async function turn(layout: LayoutMode): Promise<void> {
  await act(async () => {
    mockLayout.current = layout;
    mockListeners.forEach((listener) => { listener(); });
  });
}

/** My plan's list area laid out `height` tall (portrait: 402 wide). */
async function measureList(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('plan-screen'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 402, height } } });
  await settle();
}

/** The landscape timeline's scroller laid out `width` wide. */
async function measureTimeline(width: number): Promise<void> {
  await fireEvent(screen.getByTestId('timeline-scroll-x'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 300 } } });
  await settle();
}

async function toLandscape(width = 750): Promise<number> {
  await turn(LANDSCAPE);
  await measureTimeline(width);
  return timelineAt()!;
}

async function toPortrait(height = 700): Promise<number> {
  await turn(PORTRAIT);
  await measureList(height);
  return listAt()!;
}

async function mount(): Promise<number> {
  await render(<PerfProviders><PlanProvider><MyPlanScreen /></PlanProvider></PerfProviders>);
  await measureList(700);
  return listAt()!;
}

const itNative = Platform.OS === 'web' ? it.skip : it;

it('lands each view in the same place on every turn, without scrolling', async () => {
  const list = await mount();
  const timeline = await toLandscape();

  for (let round = 0; round < 3; round++) {
    expect(await toPortrait()).toBeCloseTo(list, 6);
    expect(await toLandscape()).toBeCloseTo(timeline, 6);
  }
});

it('lands each view on its final size, whatever passing size a turn lays it out at first', async () => {
  const list = await mount();
  const timeline = await toLandscape();

  await turn(PORTRAIT);
  await measureList(500);
  await measureList(700);
  expect(listAt()).toBeCloseTo(list, 6);

  await turn(LANDSCAPE);
  await measureTimeline(400);
  await measureTimeline(750);
  expect(timelineAt()).toBeCloseTo(timeline, 6);
});

itNative('takes no time from a scroll event alone, as a relayout moves the list', async () => {
  const list = await mount();
  const timeline = await toLandscape();
  await toPortrait();

  await fireEvent.scroll(screen.getByTestId('plan-list'), { nativeEvent: { contentOffset: { x: 0, y: list + 40 } } });

  expect(await toLandscape()).toBeCloseTo(timeline, 6);
});

it("shows where the user's drag in the list ended, and turned back lands the list there again", async () => {
  const list = await mount();
  const timeline = await toLandscape();
  await toPortrait();

  // Let go 30 pt further up: within what the list can scroll (it lands near its end).
  const dragged = list - 30;
  await fireEvent.scroll(screen.getByTestId('plan-list'), { nativeEvent: { contentOffset: { x: 0, y: dragged } } });
  await fireEvent(screen.getByTestId('plan-list'), 'scrollEndDrag', { nativeEvent: { contentOffset: { x: 0, y: dragged } } });

  const after = await toLandscape();
  expect(after).toBeLessThan(timeline);
  expect(await toPortrait()).toBeCloseTo(dragged, 6);
});

// ── A set found from landscape ────────────────────────────────────────────────
//
// It lands in its category's lane: the timeline scrolls it to the lane's middle
// (a short viewport: no title strip; Gojira and Batushka overlap, so two rows,
// 140 tall; the area not measured, so the lane's middle, 70). A lane looked up
// by another key is not found, and the timeline does not scroll vertically.

it("lands a set found from landscape in its category's lane", async () => {
  const store: { current: ReturnType<typeof usePlanStore> | null } = { current: null };
  function Probe() {
    store.current = usePlanStore();
    return null;
  }
  await render(<PerfProviders><PlanProvider><MyPlanScreen /><Probe /></PlanProvider></PerfProviders>);
  await measureList(700);
  await toLandscape();
  jest.mocked(ScrollView.prototype.scrollTo).mockClear();

  await act(async () => { store.current!.requestSet(at('06:00'), 'egojira', at('19:23')); });
  await settle();

  expect(lastScroll('timeline-scroll-y', 'y')).toBe(70);
});
