import React, { useState } from 'react';
import { measureRenders } from 'reassure';
import { act } from '@testing-library/react-native';
import { PlanTimeline } from './PlanTimeline';
import { PerfProviders } from '../../../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../../../tests/setup/perfOptions';
import { useInterestCycle } from '../../../features/interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../../cache/cacheService';
import { isPlanEligible, type PlanFilterLevel } from '../../../lib/plan';
import { setCurrentTimeMs } from '../../../utils/clock';
import { getFestivalDayStart } from '../../../utils/festivalTime';
import type { LayoutMode } from '../../../hooks/useLayoutMode';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../../types/backend';

import artistsFixture from '../../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for My plan in landscape ────────────────────────────────────
//
// The timeline My plan turns into on a phone held sideways, on the same day and
// picks as MyPlanScreen.renders.perf-test.tsx: of Wednesday's sets on the plan,
// every third a Must-see and the one after it a Maybe. The count is per commit
// of the whole tree; which lanes and blocks re-render inside a commit is
// checked by the render counts in PlanTimeline.reacts.test.tsx.

jest.mock('../../../store/AppContext', () => {
  const actual = jest.requireActual('../../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../../../hooks/useLayoutMode', () => ({
  useLayoutMode: (): LayoutMode => ({
    isWide: false, isShort: true, contentPadding: 16, bottomClearance: 80, width: 874, height: 402,
  }),
}));

const SLUG = 'ba2025';

// Wednesday 15:00, a minute boundary, with sets live.
const NOW = Date.parse('2025-08-06T15:00:00+02:00');
const WEDNESDAY = getFestivalDayStart(NOW);

const EVENTS = scheduleFixture as unknown as DbEvent[];
const ARTIST_BY_ID = new Map((artistsFixture as unknown as DbArtist[]).map((a) => [a.artistId, a]));

const DAY_SETS = EVENTS
  .filter((e) => getFestivalDayStart(e.dateFrom) === WEDNESDAY && isPlanEligible(e, ARTIST_BY_ID.get(e.artistId)!))
  .sort((a, b) => a.dateFrom - b.dateFrom || a.eventId.localeCompare(b.eventId));

const PICKS: Record<string, 'will_go' | 'maybe'> = {};
DAY_SETS.forEach((e, i) => {
  if (i % 3 === 0) {
    PICKS[e.artistId] = 'will_go';
  } else if (i % 3 === 1) {
    PICKS[e.artistId] ??= 'maybe';
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

/** Every run starts from the same picks and time: both persist. */
async function startingState(): Promise<void> {
  setCurrentTimeMs(NOW);
  for (const [artistId, status] of Object.entries(PICKS)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
}

async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

// The plan's filter is My plan's, handed down as a prop; reached here the way
// the filter panel changes it, and the picks the way a star does.
let setLevel: (level: PlanFilterLevel) => void;
let cycle: (artistId: string) => void;

function Subject() {
  const [level, set] = useState<PlanFilterLevel>('must');
  const { cycleStatus } = useInterestCycle();
  setLevel = set;
  cycle = (artistId) => { cycleStatus(artistId); };
  return <PlanTimeline day={WEDNESDAY} level={level} onPullPastTop={() => undefined} onCentreTime={() => undefined} />;
}

function measure(scenario: () => Promise<void>): Promise<void> {
  return measureRenders(<Subject />, { ...MEASURE_OPTIONS, wrapper: PerfProviders, beforeEach: startingState, scenario }).then(() => undefined);
}

test('My plan in landscape: mounting today', async () => {
  await measure(settle);
});

test('My plan in landscape: a new minute', async () => {
  await measure(async () => {
    await settle();
    setCurrentTimeMs(NOW + 60 * 1000);
    await act(async () => { await jest.advanceTimersByTimeAsync(60 * 1000); });
  });
});

test('My plan in landscape: showing all sets', async () => {
  await measure(async () => {
    await settle();
    await act(async () => { setLevel('all'); });
    await settle();
  });
});

test('My plan in landscape: one pick changed', async () => {
  await measure(async () => {
    await settle();
    // Must-see → don't go.
    await act(async () => { cycle(CHANGED); });
    await settle();
  });
});
