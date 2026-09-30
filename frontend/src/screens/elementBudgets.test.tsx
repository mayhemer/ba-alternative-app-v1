import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ArtistListScreen } from './ArtistListScreen';
import { TimelineScreen } from './TimelineScreen';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { countElements, expectWithinBudget } from '../../tests/setup/countElements';
import { createDataCollector, populateCache } from '../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Element budgets ───────────────────────────────────────────────────────────
//
// How many elements a screen asks for, held to a ceiling. This is the closest
// thing to the app's real performance problem that can be checked without a
// device: mounting a festival day "creates several hundred native views of which
// about a tenth can be seen", which once pinned a low-end Android's UI thread
// for well over a second (TimelineView). Element count is what drives that, and
// unlike any timing it is completely deterministic — so it belongs in the normal
// suite as an assertion, not in the performance suite as a measurement.
//
// What a failure means: something started asking for more views per row or per
// block. ArtistBlock's own comment is the canonical example — dropping a row
// wrapper saved "one more native view per block, and there are ~75 blocks in a
// day". A change like that in reverse shows up here as a proportional jump.
//
// What this is NOT:
//  - Not a native view count. Fabric and react-native-web both map elements to
//    host views, but not one-to-one, and a host component may create several
//    platform views internally.
//  - Not the full-day figure. The test renderer never reports real layout, so
//    TimelineView falls back to MOUNT_FALLBACK_WIDTH/HEIGHT and its
//    progressive-mount window settles smaller than it would on a phone. The
//    budgets below are for this environment, and only comparable to themselves.
//
// Budgets carry roughly 15% headroom over what is measured today. Raise one
// deliberately, with a note saying what was added; do not nudge it to make a
// failure go away.

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

const BUDGET = {
  artistList: 105,     // measured 88
  timelineSettled: 175, // measured 148
};

// One animation frame's worth of progressive mount.
const frame = (): Promise<void> => act(async () => {
  await new Promise((r) => { setTimeout(r, 16); });
});

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), Date.parse('2025-08-06T09:00:00+02:00'));
});

describe('the artist list', () => {
  it('stays within its element budget', async () => {
    const view = await render(<PerfProviders><ArtistListScreen /></PerfProviders>);

    expectWithinBudget(view.toJSON(), BUDGET.artistList, 'artist list');
  });

  it('asks for the same tree twice in a row', async () => {
    // Determinism is what makes the budget usable at all — if this drifts, the
    // ceiling is measuring the renderer's mood rather than the screen.
    const first = countElements((await render(<PerfProviders><ArtistListScreen /></PerfProviders>)).toJSON());
    const second = countElements((await render(<PerfProviders><ArtistListScreen /></PerfProviders>)).toJSON());

    expect(second.total).toBe(first.total);
    expect(second.byType).toEqual(first.byType);
  });
});

describe('the timeline', () => {
  // Only the settled day is asserted. The progressive-mount window's
  // intermediate states are not observable deterministically here: whether the
  // first snapshot catches one slice or the whole (fallback-sized) canvas
  // depends on when onLayout fires relative to the read, which measured 136 or
  // 148 on different runs of the same code. Budgeting a transient like that
  // produces a flaky test, and that the window *grows* is behaviour for the
  // device layer to confirm, where layout is real.
  it('keeps the settled day within budget', async () => {
    const view = await render(<PerfProviders><TimelineScreen /></PerfProviders>);
    for (let i = 0; i < 20; i++) {
      await frame();
    }

    expectWithinBudget(view.toJSON(), BUDGET.timelineSettled, 'timeline settled day');
  });
});
