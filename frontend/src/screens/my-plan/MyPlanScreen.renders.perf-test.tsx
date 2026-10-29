import React from 'react';
import { measureRenders } from 'reassure';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { MyPlanScreen } from './MyPlanScreen';
import { NowPill } from './NowPill';
import { PlanDaySwitcher } from './PlanDaySwitcher';
import { PlanFilterChip } from './filter/PlanFilterChip';
import { PlanFilterPanel } from './filter/PlanFilterPanel';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../../tests/setup/perfOptions';
import { PlanProvider, usePlanFilters, usePlanStore } from './PlanContext';
import { useInterestCycle } from '../../features/interests/InterestContext';
import { createDataCollector, getFestivalDays, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import { setPlanFilters } from '../../store/uiStatePersistence';
import { isConflictEligible } from '../../features/conflicts/conflictUtils';
import { setCurrentTimeMs } from '../../utils/clock';
import { getFestivalDayStart } from '../../utils/festivalTime';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for My plan ─────────────────────────────────────────────────
//
// The screen and the now pill on a realistic day: of Wednesday's 55 sets of up
// to two hours, every third is a Must-see and the one after it a Maybe. The
// count is per commit of the whole tree, so it gates a memo or a context that
// starts committing more often; which rows re-render inside a commit is checked
// by the render counts in MyPlanScreen.test.tsx.

const SLUG = 'ba2025';

// Wednesday 15:00, a minute boundary, with sets live.
const NOW = Date.parse('2025-08-06T15:00:00+02:00');
const WEDNESDAY = getFestivalDayStart(NOW);

const EVENTS = scheduleFixture as unknown as DbEvent[];

const DAY_SETS = EVENTS
  .filter((e) => getFestivalDayStart(e.dateFrom) === WEDNESDAY && isConflictEligible(e))
  .sort((a, b) => a.dateFrom - b.dateFrom || a.eventId.localeCompare(b.eventId));

const PICKS: Record<string, 'will_go' | 'maybe'> = {};
DAY_SETS.forEach((e, i) => {
  if (i % 3 === 0) {
    PICKS[e.artistId] = 'will_go';
  } else if (i % 3 === 1) {
    PICKS[e.artistId] ??= 'maybe';
  }
});

/** Thursday picked the same way, for the day switch: one full day to another. */
const THURSDAY = WEDNESDAY + 24 * 60 * 60 * 1000;
const THURSDAY_PICKS: Record<string, 'will_go' | 'maybe'> = {};
EVENTS
  .filter((e) => getFestivalDayStart(e.dateFrom) === THURSDAY && isConflictEligible(e))
  .sort((a, b) => a.dateFrom - b.dateFrom || a.eventId.localeCompare(b.eventId))
  .forEach((e, i) => {
    if (PICKS[e.artistId] !== undefined) {
      return;
    }
    if (i % 3 === 0) {
      THURSDAY_PICKS[e.artistId] = 'will_go';
    } else if (i % 3 === 1) {
      THURSDAY_PICKS[e.artistId] ??= 'maybe';
    }
  });

/** A Must-see whose pick the "one pick changed" scenario flips. */
const CHANGED = DAY_SETS[3].artistId;

beforeAll(() => {
  // Fake timers make the counts exact and let a scenario fire the minute tick.
  // Promises, the clock and performance.now stay real.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(EVENTS);
  populateCache(SLUG, collector.build(), NOW);
});

afterAll(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

/** Every run starts from the same picks, filters and time: all of them persist. */
async function startingState(): Promise<void> {
  setCurrentTimeMs(NOW);
  setPlanFilters({ showMaybe: false, conflictsOnly: false });
  for (const [artistId, status] of Object.entries(PICKS)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
}

async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

// Reaches the filters, the picks and the shown day the way the UI does, without
// mounting the chrome that is not under measurement.
let toggleMaybe: () => void;
let toggleConflictsOnly: () => void;
let cycle: (artistId: string) => void;
let pickDay: (day: number) => void;

function Controls() {
  const filters = usePlanFilters();
  const { cycleStatus } = useInterestCycle();
  const store = usePlanStore();
  toggleMaybe = filters.toggleMaybe;
  toggleConflictsOnly = filters.toggleConflictsOnly;
  cycle = (artistId) => { cycleStatus(artistId); };
  pickDay = (day) => { store.pickDay(day, NOW); };
  return null;
}

function Subject() {
  return (
    <>
      <Controls />
      <NowPill />
      <MyPlanScreen />
    </>
  );
}

function Wrapper({ children }: { children: React.ReactElement }) {
  return (
    <PerfProviders>
      <PlanProvider>{children}</PlanProvider>
    </PerfProviders>
  );
}

function measure(scenario: () => Promise<void>, beforeEach: () => Promise<void> = startingState): Promise<void> {
  return measureRenders(<Subject />, { ...MEASURE_OPTIONS, wrapper: Wrapper, beforeEach, scenario }).then(() => undefined);
}

/** The starting state with Thursday picked too, so a day switch lands on a full day. */
async function startingStateWithThursday(): Promise<void> {
  await startingState();
  for (const [artistId, status] of Object.entries(THURSDAY_PICKS)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
}

/** A phone's list height, reported as onLayout would: from then on a day lands where it is shown. */
async function measureScreen(): Promise<void> {
  await act(async () => {
    fireEvent(screen.getByTestId('plan-screen'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
  });
}

test('My plan: mounting today', async () => {
  await measure(settle);
});

test('My plan: a new minute', async () => {
  await measure(async () => {
    await settle();
    setCurrentTimeMs(NOW + 60 * 1000);
    await act(async () => { await jest.advanceTimersByTimeAsync(60 * 1000); });
  });
});

test('My plan: showing Maybe picks', async () => {
  await measure(async () => {
    await settle();
    await act(async () => { toggleMaybe(); });
    await settle();
  });
});

test('My plan: one pick changed', async () => {
  await measure(async () => {
    await settle();
    // Must-see → don't go.
    await act(async () => { cycle(CHANGED); });
    await settle();
  });
});

// ── The chrome alone: day switcher, filter chip, filter panel ─────────────────
//
// Without the screen, so the count is the chrome's own. Which of its elements
// render inside a commit is checked in MyPlanScreen.test.tsx ("the chrome").

function Chrome() {
  return (
    <>
      <Controls />
      <PlanFilterChip />
      <PlanFilterPanel />
      <PlanDaySwitcher />
    </>
  );
}

function measureChrome(scenario: () => Promise<void>): Promise<void> {
  return measureRenders(<Chrome />, { ...MEASURE_OPTIONS, wrapper: Wrapper, beforeEach: startingState, scenario }).then(() => undefined);
}

test('My plan chrome: a new minute', async () => {
  await measureChrome(async () => {
    await settle();
    setCurrentTimeMs(NOW + 60 * 1000);
    await act(async () => { await jest.advanceTimersByTimeAsync(60 * 1000); });
  });
});

test('My plan chrome: opening the filter panel', async () => {
  await measureChrome(async () => {
    await settle();
    await act(async () => { fireEvent.press(screen.getByLabelText('Filters')); });
    await settle();
  });
});

test('My plan chrome: showing only conflicts', async () => {
  await measureChrome(async () => {
    await settle();
    await act(async () => { toggleConflictsOnly(); });
    await settle();
  });
});

// Last in the file: its Thursday picks persist, and no scenario after it should see them.
test('My plan: switching to another day', async () => {
  // Wednesday → Thursday, both picked: one full day to another, the expensive
  // case, as the timeline's day switch measures it. (An empty day would flatter it.)
  const days = getFestivalDays(SLUG);
  const next = days[days.indexOf(WEDNESDAY) + 1];
  expect(next).toBe(THURSDAY);
  await measure(async () => {
    await settle();
    await measureScreen();
    await settle();
    await act(async () => { pickDay(next); });
    await settle();
  }, startingStateWithThursday);
});
