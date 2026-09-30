import React from 'react';
import { measureRenders } from 'reassure';
import { act } from '@testing-library/react-native';
import { TimelineScreen } from './TimelineScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { createDataCollector, getFestivalDays, populateCache } from '../cache/cacheService';
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

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), SYNCED_AT);
});

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
  await measureRenders(<Subject />, { ...MEASURE_OPTIONS, wrapper: PerfProviders });
});

test('switching to another festival day', async () => {
  const days = getFestivalDays('ba2025');
  const target = days[1] ?? days[0];

  await measureRenders(<Subject />, {
    ...MEASURE_OPTIONS,
    wrapper: PerfProviders,
    scenario: async () => {
      await act(async () => { switchDay(target); });
    },
  });
});
