import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { PlanTimeline } from './PlanTimeline';
import { PerfProviders } from '../../../../tests/setup/PerfProviders';
import { rendersSinceReset, resetRenders } from '../../../../tests/setup/countRenders';
import { useInterestCycle } from '../../../features/interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../../cache/cacheService';
import { setCurrentTimeMs } from '../../../utils/clock';
import type { PlanFilterLevel } from '../../../lib/plan';
import type { LayoutMode } from '../../../hooks/useLayoutMode';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../../types/backend';

import artistsFixture from '../../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../../tests/fixtures/generated/ba2025/schedule.json';

// ── My plan's landscape timeline reacts to every input ────────────────────────
//
// Which sets it shows is PlanTimeline.model's (unit-tested there); here, that
// the drawn timeline follows each input as it changes: the plan's filter, a
// pick, a sync that moves or removes a set. Then the render counts: after one
// change, which elements render again, by key — a block by its eventId, a lane
// by its categoryId, a title as `title-<categoryId>`.
//
// Wednesday, 2025 data. CRYSTAL LAKE (artist 35, set 7020) 14:00–14:40, Sea
// Shepherd (category 2, on the Sea Shepherd stage, with every other band of
// that category); EXORCIZPHOBIA (216, 7022) 14:30–15:05 and RIVERS OF NIHIL
// (51, 7029) 16:40–17:20, both Obscure (3). CRYSTAL LAKE and EXORCIZPHOBIA
// overlap. BLOOD RED THRONE plays Sea Shepherd too, never picked here. M&G -
// CRYSTAL LAKE (169, set 7021) and M&G - SIGH (173), support items, both Meet &
// Greet (6) on the Meet & Greet stage.

jest.mock('../../../store/AppContext', () => {
  const actual = jest.requireActual('../../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../../../hooks/useLayoutMode', () => ({
  useLayoutMode: (): LayoutMode => ({
    isWide: false, isShort: true, contentPadding: 16, bottomClearance: 80, width: 874, height: 402,
  }),
}));

jest.mock('../../../auth/AuthContext', () => ({
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

// Each timeline element is swapped for a counting copy that renders exactly the
// same (tests/setup/countRenders.ts), for the render counts at the end.
jest.mock('../../../features/timeline/ArtistBlock', () => {
  const { counted } = require('../../../../tests/setup/countRenders');
  const actual = jest.requireActual('../../../features/timeline/ArtistBlock');
  return { ...actual, ArtistBlock: counted(actual.ArtistBlock) };
});
jest.mock('../../../features/timeline/CategoryLane', () => {
  const { counted } = require('../../../../tests/setup/countRenders');
  const actual = jest.requireActual('../../../features/timeline/CategoryLane');
  return { ...actual, CategoryLane: counted(actual.CategoryLane) };
});
jest.mock('../../../features/timeline/LaneTitle', () => {
  const { counted } = require('../../../../tests/setup/countRenders');
  const actual = jest.requireActual('../../../features/timeline/LaneTitle');
  return { ...actual, LaneTitle: counted(actual.LaneTitle) };
});

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const NOW = Date.parse('2025-08-06T12:00:00+02:00');

/** Syncs the cache with the fixture's sets, changed by `change`, the way a background sync does. */
function syncWith(change: (events: DbEvent[]) => DbEvent[]): void {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(change(scheduleFixture as unknown as DbEvent[]));
  populateCache('ba2025', collector.build(), NOW);
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  setCurrentTimeMs(NOW);
  syncWith((events) => events);
});

afterEach(() => {
  syncWith((events) => events);
});

afterAll(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

/** Under Jest each act() mounts one more slice of the day; eight cover Wednesday. */
async function settleWholeDay(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await settle();
  }
}

let setLevel: (level: PlanFilterLevel) => void;
let cycle: (artistId: string) => void;

function Subject({ initial }: { initial: PlanFilterLevel }) {
  const [level, set] = useState(initial);
  const { cycleStatus } = useInterestCycle();
  setLevel = set;
  cycle = (artistId) => { cycleStatus(artistId); };
  return <PlanTimeline day={WED} level={level} onPullPastTop={() => undefined} onCentreTime={() => undefined} />;
}

async function mount(level: PlanFilterLevel): Promise<void> {
  await render(<PerfProviders><Subject initial={level} /></PerfProviders>);
  await settleWholeDay();
}

async function withPicks(picks: Record<string, 'will_go' | 'maybe'>, run: () => Promise<void>): Promise<void> {
  for (const [artistId, status] of Object.entries(picks)) {
    await setInterest('ba2025', artistId, status);
  }
  await hydrateInterests('ba2025');
  try {
    await run();
  } finally {
    for (const artistId of ['35', '216', '51', '169']) {
      await setInterest('ba2025', artistId, 'none');
    }
    await hydrateInterests('ba2025');
  }
}

const shows = (text: string): boolean => screen.queryAllByText(text).length > 0;

describe('the landscape timeline reacts', () => {
  it('follows the filter, out to All sets and back', async () => {
    await withPicks({ '35': 'will_go', '216': 'will_go', '51': 'maybe' }, async () => {
      await mount('conflicts');
      expect([shows('CRYSTAL LAKE'), shows('EXORCIZPHOBIA'), shows('RIVERS OF NIHIL')]).toEqual([true, true, false]);

      await act(async () => { setLevel('maybe'); });
      await settleWholeDay();
      expect(shows('RIVERS OF NIHIL')).toBe(true);
      expect(shows('BLOOD RED THRONE')).toBe(false);

      await act(async () => { setLevel('all'); });
      await settleWholeDay();
      expect(shows('BLOOD RED THRONE')).toBe(true);

      await act(async () => { setLevel('must'); });
      await settleWholeDay();
      expect([shows('BLOOD RED THRONE'), shows('RIVERS OF NIHIL'), shows('CRYSTAL LAKE')]).toEqual([false, false, true]);
    });
  });

  it("adds a category's lane with a pick in it, and drops it when the pick goes", async () => {
    await withPicks({ '35': 'will_go' }, async () => {
      await mount('must');
      expect([shows('Sea Shepherd'), shows('Obscure')]).toEqual([true, false]);

      // None → Maybe → Must-see.
      await act(async () => { cycle('216'); });
      await act(async () => { cycle('216'); });
      await settleWholeDay();
      expect([shows('Obscure'), shows('EXORCIZPHOBIA')]).toEqual([true, true]);

      // Must-see → don't go: no pick.
      await act(async () => { cycle('216'); });
      await settleWholeDay();
      expect([shows('Obscure'), shows('EXORCIZPHOBIA')]).toEqual([false, false]);
    });
  });

  it('follows a sync that moves the pick to another stage, and one that removes it', async () => {
    await withPicks({ '169': 'maybe' }, async () => {
      await mount('all');
      expect([shows('M&G - CRYSTAL LAKE'), shows('M&G - SIGH')]).toEqual([true, true]);

      // Moved to another stage: still Meet & Greet, its old stage no longer picked.
      await act(async () => { syncWith((events) => events.map((e) => (e.eventId === '7021' ? { ...e, stageId: 'moved' } : e))); });
      await settleWholeDay();
      expect([shows('M&G - CRYSTAL LAKE'), shows('M&G - SIGH')]).toEqual([true, false]);

      await act(async () => { syncWith((events) => events.filter((e) => e.eventId !== '7021')); });
      await settleWholeDay();
      expect([shows('M&G - CRYSTAL LAKE'), shows('Meet & Greet')]).toEqual([false, false]);
    });
  });

  it('shows every band under All sets, with no pick in its category', async () => {
    await withPicks({ '169': 'maybe' }, async () => {
      await mount('all');
      expect([shows('BLOOD RED THRONE'), shows('Sea Shepherd')]).toEqual([true, true]);
    });
  });

  describe('render counts', () => {
    it('a pick in a shown lane renders only its block and its lane', async () => {
      await withPicks({ '35': 'will_go', '51': 'maybe' }, async () => {
        await mount('maybe');
        resetRenders();
        // Maybe → Must-see.
        await act(async () => { cycle('51'); });
        await settle();
        expect(rendersSinceReset()).toEqual({ '3': 1, '7029': 1 });
      });
    });

    it('a new minute renders nothing', async () => {
      await withPicks({ '35': 'will_go' }, async () => {
        await mount('all');
        resetRenders();
        setCurrentTimeMs(NOW + 60 * 1000);
        await act(async () => { await jest.advanceTimersByTimeAsync(60 * 1000); });
        expect(rendersSinceReset()).toEqual({});
        setCurrentTimeMs(NOW);
      });
    });
  });
});
