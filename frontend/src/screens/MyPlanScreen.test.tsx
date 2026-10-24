import React, { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { MyPlanScreen } from './MyPlanScreen';
import { NowPill } from '../components/plan/NowPill';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { PlanProvider, usePlanFilters, usePlanStore } from '../context/PlanContext';
import { useInterest } from '../context/InterestContext';
import { createDataCollector, populateCache, setInterest } from '../cache/cacheService';
import { setCurrentTimeMs } from '../utils/clock';
import { setPlanFilters, setScroll } from '../store/uiStatePersistence';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import { rendersSinceReset, resetRenders } from '../../tests/setup/countRenders';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

// ── My plan reacts to every input ─────────────────────────────────────────────
//
// The screen and the now pill, mounted with their real providers, while each
// input changes in turn. The inputs:
//   filters   — Show Maybe picks; Show only conflicts
//   interests — a pick changed (Must-see → don't go)
//   events    — a set moved, added or removed by a cache sync
//   time      — the minute tick; a new minute that ends a set
//   day       — another day picked
// Each case checks what is on screen, not how it got there. The render counts
// at the end check the other half: elements whose output did not change are not
// rendered again.

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'plantest' };
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

// Each element component is swapped for a counting copy that renders exactly
// the same (tests/setup/countRenders.ts), for the render counts below.
jest.mock('../components/plan/PlanSetRow', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../components/plan/PlanSetRow');
  return { ...actual, PlanSetRow: counted(actual.PlanSetRow) };
});
jest.mock('../components/plan/PlanGap', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../components/plan/PlanGap');
  return { ...actual, PlanGap: counted(actual.PlanGap) };
});
jest.mock('../components/plan/PlanCap', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../components/plan/PlanCap');
  return { ...actual, PlanCap: counted(actual.PlanCap) };
});
jest.mock('../components/plan/PlanEmpty', () => {
  const { counted } = require('../../tests/setup/countRenders');
  const actual = jest.requireActual('../components/plan/PlanEmpty');
  return { ...actual, PlanEmpty: counted(actual.PlanEmpty) };
});

const SLUG = 'plantest';

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const FRI = getFestivalDayStart(at(8, '12:00'));

// ── Fixture: a small Thursday and one Friday set ──────────────────────────────
//

function artist(artistId: string, name: string): DbArtist {
  return { slug: SLUG, artistId, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}

function event(artistId: string, from: number, to: number): DbEvent {
  return { slug: SLUG, eventId: `e${artistId}`, dateFrom: from, dateTo: to, artistId, stageId: 's1', categoryId: 'c1' };
}

const ARTISTS = [
  artist('hooded', 'Hooded Menace'),
  artist('blood', 'Blood Incantation'),
  artist('gojira', 'Gojira'),
  artist('batushka', 'Batushka'),
  artist('spectral', 'Spectral Wound'),
  artist('late', 'Late Addition'),
];

const EVENTS: DbEvent[] = [
  event('hooded', at(7, '14:00'), at(7, '14:40')),
  event('blood', at(7, '15:30'), at(7, '16:15')),
  event('gojira', at(7, '19:00'), at(7, '20:00')),
  event('batushka', at(7, '19:40'), at(7, '20:30')),
  event('spectral', at(8, '12:30'), at(8, '13:10')),
];

const STAGES: DbStage[] = [{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] }];
const CATEGORIES: DbCategory[] = [{ slug: SLUG, categoryId: 'c1', color: 0x445566, localized: [] }];

function sync(events: DbEvent[]): void {
  const collector = createDataCollector();
  collector.setArtists(ARTISTS);
  collector.setCategories(CATEGORIES);
  collector.setStages(STAGES);
  collector.setEvents(events);
  populateCache(SLUG, collector.build(), at(7, '09:00'));
}

// ── Harness ───────────────────────────────────────────────────────────────────

type ControlHandles = {
  toggleMaybe: () => void;
  toggleConflictsOnly: () => void;
  cycle: (artistId: string) => void;
  pickDay: (day: number) => void;
};

let controls: ControlHandles;

function Controls() {
  const { toggleMaybe, toggleConflictsOnly } = usePlanFilters();
  const { cycleStatus } = useInterest();
  const store = usePlanStore();
  controls = {
    toggleMaybe,
    toggleConflictsOnly,
    cycle: (artistId) => { cycleStatus(artistId); },
    pickDay: (day) => { store.pickDay(day, at(7, '19:23')); },
  };
  return null;
}

/**
 * Commits of the whole tree since the last reset, counted at its root as
 * Reassure does. A Profiler lower down misses commits that reach the screen
 * through context from a provider above it.
 */
let commits = 0;
const countCommit = (): void => { commits += 1; };

function Subject() {
  return (
    <PlanProvider>
      <Controls />
      <NowPill />
      <MyPlanScreen />
    </PlanProvider>
  );
}

async function mount(): Promise<void> {
  await render(<Profiler id="root" onRender={countCommit}><PerfProviders><Subject /></PerfProviders></Profiler>);
}

/** Every text the plan list shows, top to bottom (the pill's are not in it). */
type TreeNode = string | { children: readonly TreeNode[] };

function listTexts(): string[] {
  const texts: string[] = [];
  const walk = (node: TreeNode): void => {
    if (typeof node === 'string') {
      texts.push(node);
    } else {
      node.children.forEach(walk);
    }
  };
  walk(screen.getByTestId('plan-list'));
  return texts;
}

/** What the now pill says: its accessibility label. */
function pill(): string {
  return screen.getByTestId('now-pill').props.accessibilityLabel as string;
}

async function minuteTo(time: number): Promise<void> {
  setCurrentTimeMs(time);
  await act(async () => { jest.advanceTimersByTime(60 * 1000); });
}

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  setCurrentTimeMs(at(7, '19:23'));
  // The filters persist across mounts: every case starts from the defaults.
  setPlanFilters({ showMaybe: false, conflictsOnly: false });
  sync(EVENTS);
  await setInterest(SLUG, 'hooded', 'will_go');
  await setInterest(SLUG, 'blood', 'maybe');
  await setInterest(SLUG, 'gojira', 'will_go');
  await setInterest(SLUG, 'batushka', 'will_go');
  await setInterest(SLUG, 'spectral', 'will_go');
  await setInterest(SLUG, 'late', 'will_go');
});

afterEach(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

// ── Cases ─────────────────────────────────────────────────────────────────────

it('shows today at mount: the live set, the clashing one about to start, Maybes hidden', async () => {
  await mount();
  const texts = listTexts();
  expect(texts).toEqual(expect.arrayContaining(['Hooded Menace', 'Gojira', 'LIVE', '−37 min', 'Batushka', 'START', '−17 min']));
  expect(texts).not.toContain('Blood Incantation');
  expect(pill()).toBe('Gojira LIVE −37\u202Fmin');
});

it('lists the Maybes when they are switched on, and drops them when switched off', async () => {
  await mount();
  await act(async () => { controls.toggleMaybe(); });
  expect(listTexts()).toContain('Blood Incantation');
  await act(async () => { controls.toggleMaybe(); });
  expect(listTexts()).not.toContain('Blood Incantation');
});

it('keeps only the clashing sets with only conflicts on', async () => {
  await mount();
  await act(async () => { controls.toggleConflictsOnly(); });
  const texts = listTexts();
  expect(texts).not.toContain('Hooded Menace');
  expect(texts).toEqual(expect.arrayContaining(['Gojira', 'Batushka', 'Conflict']));
});

it('drops a set whose pick changes, with the clash it made', async () => {
  await mount();
  // Must-see → don't go.
  await act(async () => { controls.cycle('batushka'); });
  const texts = listTexts();
  expect(texts).not.toContain('Batushka');
  expect(texts).not.toContain('START');
  expect(texts).not.toContain('Conflict');
});

it('follows a set moved by a sync, in the list and in the pill', async () => {
  await mount();
  await act(async () => {
    sync(EVENTS.map((e) => (e.artistId === 'gojira' ? { ...e, dateFrom: at(7, '21:00'), dateTo: at(7, '22:00') } : e)));
  });
  const texts = listTexts();
  expect(texts).toContain('21:00–22:00');
  expect(texts).not.toContain('LIVE');
  // The next Must-see is now Batushka, at 19:40.
  expect(pill()).toBe('Batushka START −17\u202Fmin');
});

it('lists a set added by a sync, and drops one removed by it', async () => {
  await mount();
  await act(async () => {
    sync([...EVENTS.filter((e) => e.artistId !== 'hooded'), event('late', at(7, '22:30'), at(7, '23:00'))]);
  });
  const texts = listTexts();
  expect(texts).toContain('Late Addition');
  expect(texts).not.toContain('Hooded Menace');
});

it('counts down with every new minute, in the list and in the pill', async () => {
  await mount();
  await minuteTo(at(7, '19:24'));
  expect(listTexts()).toEqual(expect.arrayContaining(['−36 min', '−16 min']));
  expect(pill()).toBe('Gojira LIVE −36\u202Fmin');
});

it('moves on when a new minute ends a set', async () => {
  await mount();
  await minuteTo(at(7, '20:30'));
  const texts = listTexts();
  expect(texts).not.toContain('LIVE');
  expect(texts.filter((t) => t === 'done')).toHaveLength(3);
  expect(screen.queryByTestId('now-pill')).toBeNull();
});

it('shows another day when it is picked', async () => {
  await mount();
  await act(async () => { controls.pickDay(FRI); });
  const texts = listTexts();
  expect(texts).toContain('Spectral Wound');
  expect(texts).not.toContain('Gojira');
});

// ── Landing a day ─────────────────────────────────────────────────────────────
//
// Once the screen's height is known, each day gets a list of its own that starts
// at its landing spot and draws the cells there first, the way the timeline
// mounts a day. At Thursday 19:23 (Maybes hidden) the list is: the start cap at
// 12 (30 tall), Hooded Menace at 48 (58), the 4 h 20 gap at 112 (150), Gojira
// (live) at 268, Batushka at 332, the end cap at 396. On a 300 pt screen "now"
// lands at 268 − 300 / 3 = 168, inside the gap.

const THU = getFestivalDayStart(at(7, '12:00'));

async function measureScreen(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('plan-screen'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } });
}

function listOffset(): unknown {
  return screen.getByTestId('plan-list').props.contentOffset;
}

it('starts another day at its landing spot, drawing the cells from there down', async () => {
  await mount();
  await measureScreen(300);
  await act(async () => { controls.pickDay(FRI); });
  // Not today, nothing saved: the top.
  expect(listOffset()).toEqual({ x: 0, y: 0 });
  expect(listTexts()).toContain('Spectral Wound');

  await act(async () => { controls.pickDay(THU); });
  // Today: "now" a third from the top.
  expect(listOffset()).toEqual({ x: 0, y: 168 });
  const texts = listTexts();
  expect(texts).toEqual(expect.arrayContaining(['4 h 20', 'Gojira', 'Batushka']));
  expect(texts).not.toContain('Hooded Menace');
});

// It leaves Friday's position saved, so no case after it lands on Friday.
it('starts a day the user scrolled where they left it', async () => {
  setScroll('plan', FRI, 60);
  await mount();
  await measureScreen(300);
  await act(async () => { controls.pickDay(FRI); });
  expect(listOffset()).toEqual({ x: 0, y: 60 });
});

// ── Render counts ─────────────────────────────────────────────────────────────
//
// Which elements render again after one change, by item key. An element renders
// again only when what it shows changes (a new element renders once, to mount).
// At Thursday 19:23 the list is:
//   cap-start · ehooded (done) · gap-egojira (4 h 20, carries the
//   conflict title) · egojira (live) · ebatushka (START) · cap-end

describe('render counts', () => {
  async function mountSettled(): Promise<void> {
    await mount();
    await act(async () => { jest.advanceTimersByTime(1000); });
    resetRenders();
  }

  it('a new minute renders only the sets whose countdown changed', async () => {
    await mountSettled();
    await minuteTo(at(7, '19:24'));
    expect(rendersSinceReset()).toEqual({ egojira: 1, ebatushka: 1 });
  });

  it('a sync that changes nothing on the shown day renders nothing', async () => {
    await mountSettled();
    await act(async () => {
      sync(EVENTS.map((e) => (e.artistId === 'spectral' ? { ...e, dateFrom: at(8, '14:00'), dateTo: at(8, '14:40') } : e)));
    });
    expect(rendersSinceReset()).toEqual({});
  });

  it('showing the Maybes renders the new Maybe and its gap, and the gap it shortened', async () => {
    await mountSettled();
    await act(async () => { controls.toggleMaybe(); });
    expect(rendersSinceReset()).toEqual({ eblood: 1, 'gap-eblood': 1, 'gap-egojira': 1 });
  });

  it('dropping the first set renders only the start cap, which now carries the conflict title', async () => {
    await mountSettled();
    // Must-see → don't go.
    await act(async () => { controls.cycle('hooded'); });
    expect(rendersSinceReset()).toEqual({ 'cap-start': 1 });
  });
});

// ── Commits ───────────────────────────────────────────────────────────────────
//
// Two commits per change: the change itself, then FlatList's cell-window check,
// which runs 50 ms after each update and commits the list again, unchanged (no
// element renders in it: see the render counts above). A day switch commits
// once: the day gets a fresh list, which schedules no such check. The list is a
// FlatList anyway: it scrolled faster on phones than a ScrollView rendering
// every cell. Timers run on for a second after the change, so both are counted.

describe('commits', () => {
  async function mountSettled(): Promise<void> {
    await mount();
    await act(async () => { jest.advanceTimersByTime(1000); });
    commits = 0;
  }

  async function settle(): Promise<void> {
    await act(async () => { jest.advanceTimersByTime(1000); });
  }

  it('a new minute commits twice: the change, then the cell-window check', async () => {
    await mountSettled();
    await minuteTo(at(7, '19:24'));
    await settle();
    expect(commits).toBe(2);
  });

  it('a changed pick commits twice: the change, then the cell-window check', async () => {
    await mountSettled();
    await act(async () => { controls.cycle('batushka'); });
    await settle();
    expect(commits).toBe(2);
  });

  it('showing the Maybes commits twice: the change, then the cell-window check', async () => {
    await mountSettled();
    await act(async () => { controls.toggleMaybe(); });
    await settle();
    expect(commits).toBe(2);
  });

  // A day gets a freshly mounted list of its own, which schedules no cell-window commit.
  it('another day commits once', async () => {
    await mountSettled();
    await act(async () => { controls.pickDay(FRI); });
    await settle();
    expect(commits).toBe(1);
  });
});
