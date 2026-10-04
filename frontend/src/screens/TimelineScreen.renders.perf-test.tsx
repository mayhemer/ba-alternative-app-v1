import React from 'react';
import { measureRenders } from 'reassure';
import { act } from '@testing-library/react-native';
import { TimelineScreen } from './TimelineScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { createDataCollector, getFestivalDays, populateCache } from '../cache/cacheService';
import { setCurrentTimeMs } from '../utils/clock';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for the timeline ────────────────────────────────────────────
//
// The day switch is the app's most expensive documented interaction: mounting a
// day creates several hundred native views, which once pinned a low-end
// Android's UI thread for over a second. The progressive-mount window exists to
// spread that over frames, and it only works while the lane and block memos keep
// skipping what is already on screen.
//
// A render count is the right gate for that. It cannot see native view creation
// — nothing in Node can — but it does see the thing that breaks first: a memo
// that stops skipping, so the whole canvas re-renders per mount step instead of
// only the newly revealed slice.

const SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');

// Wednesday, a full festival day, so the timeline opens on it rather than on
// whichever day the real clock happens to fall back to.
const NOW = Date.parse('2025-08-06T12:00:00+02:00');

beforeAll(() => {
  // Fake timers make the counts exact. The timeline mounts one slice of the day
  // per animation frame, and with real timers two queued frames sometimes fire
  // back to back and React batches them into one render — this suite reported
  // 3.93 and 4.10 for the same code. Promises, the clock and performance.now
  // (which the durations are measured with) stay real. Same arrangement as
  // TimelineScreen.interest.renders.perf-test.tsx.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  setCurrentTimeMs(NOW);
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), SYNCED_AT);
});

afterAll(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

/** Runs the progressive mount to completion: one slice of the day per frame. */
async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

// Reaches the day setter the way the DaySwitcher does, without mounting the
// BottomBar chrome that is not under measurement here.
let switchDay: (ts: number) => void;

function DayControl() {
  const { setSelectedDayStart } = useTimelineFilter();
  switchDay = setSelectedDayStart;
  return null;
}

function Subject() {
  return (
    <>
      <DayControl />
      <TimelineScreen />
    </>
  );
}

test('mounting the timeline', async () => {
  // Through to the settled day, so the count covers every mount slice and not
  // just however many frames happened to fire before measuring stopped.
  await measureRenders(<Subject />, { ...MEASURE_OPTIONS, wrapper: PerfProviders, scenario: settle });
});

test('switching to another festival day', async () => {
  // Wednesday → Thursday: one full day to another, the expensive case. (The
  // warm-up Tuesday has a single lane and would flatter it.)
  const days = getFestivalDays('ba2025');
  const opened = days.find((d) => d <= NOW && NOW < d + 24 * 60 * 60 * 1000)!;
  const target = days[days.indexOf(opened) + 1];

  await measureRenders(<Subject />, {
    ...MEASURE_OPTIONS,
    wrapper: PerfProviders,
    scenario: async () => {
      await settle();
      await act(async () => { switchDay(target); });
      await settle();
    },
  });
});
