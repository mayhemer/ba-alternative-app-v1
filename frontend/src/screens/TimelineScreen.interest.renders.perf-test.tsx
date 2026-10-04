import React from 'react';
import { measureRenders } from 'reassure';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { TimelineScreen } from './TimelineScreen';
import { ArtistDetailSheet } from '../components/layout/ArtistDetailSheet';
import { PerfProviders } from '../../tests/setup/PerfProviders';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { useInterestCycle, type InterestStatus } from '../context/InterestContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useConflicts } from '../context/ConflictContext';
import { createDataCollector, getArtists, hydrateInterests, populateCache, setInterest } from '../cache/cacheService';
import { setCurrentTimeMs } from '../utils/clock';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Render counts for an interest change on the timeline ──────────────────────
//
// The timeline is where an interest change repaints most: the block's own look
// changes, and when two must-sees overlap both blocks gain conflict bars. The
// conflict pairing then re-runs in ConflictContext and again in the timeline's
// own data hook. Each case is measured twice:
//
//   - through the interest context, the way the day-switch test drives its
//     selector: only the timeline's reaction, nothing else in the tree;
//   - by pressing the star in the artist's detail sheet, which is how a user
//     does it. The count then includes opening the sheet, the same in all three
//     sheet scenarios, so compare them with each other, not with the context ones.
//
// What a count catches is a memo that stops skipping: one star repainting the
// whole canvas rather than the block (or the clashing pair) it touches.

// The sheet library runs its layout and gestures as Reanimated worklets, which
// do not run under Jest, so it is swapped for its own published mock. That
// renders the sheet's content straight into the tree: our header, star and body
// are real, and only the library's animation shell is missing. That shell could
// not be measured in Node anyway. (The mock is CommonJS with a `default` key, so
// it is flagged as an ES module for the sheet's default import to resolve.)
jest.mock('@gorhom/bottom-sheet', () => ({ __esModule: true, ...require('@gorhom/bottom-sheet/mock') }));

// All on Wednesday 6 Aug 2025, which is the day the timeline opens on (see NOW).
// EXORCIZPHOBIA is a must-see in every scenario. CRYSTAL LAKE overlaps it on
// another stage; RIVERS OF NIHIL is on EXORCIZPHOBIA's stage, later, and
// overlaps nothing, so the no-conflict case repaints the same lane.
const EXORCIZPHOBIA = '216';  // 14:30–15:05
const CRYSTAL_LAKE = '35';    // 14:00–14:40
const RIVERS_OF_NIHIL = '51'; // 16:40

// The timeline opens on "today" when it is a festival day.
const NOW = Date.parse('2025-08-06T12:00:00+02:00');
const SLUG = 'ba2025';

beforeAll(() => {
  // Fake timers make the counts exact. The timeline mounts one slice of the day
  // per animation frame, and with real timers two queued frames sometimes fire
  // back to back and React batches them into one render, so a run counted 6 or
  // 7 depending on the machine's timing. Promises, the clock and
  // performance.now (which the durations are measured with) stay real.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  setCurrentTimeMs(NOW);
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache(SLUG, collector.build(), NOW);
});

afterAll(() => {
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

/**
 * Puts the three artists back in a known state before every run. Interests are
 * persisted, so without this each run would start where the previous one left
 * off, and a star cycles: none → maybe → must see → none.
 */
function startingFrom(statuses: Record<string, InterestStatus>): () => Promise<void> {
  return async () => {
    const all = { [CRYSTAL_LAKE]: 'none', [RIVERS_OF_NIHIL]: 'none', [EXORCIZPHOBIA]: 'must_see', ...statuses };
    for (const [artistId, status] of Object.entries(all)) {
      await setInterest(SLUG, artistId, status as InterestStatus);
    }
    await hydrateInterests(SLUG);
  };
}

/**
 * Lets the mount finish before the interaction: the interest hydration from
 * storage, and the progressive mount, which adds one slice of the day per
 * frame. A press during either would mix their renders into its own.
 */
async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

// Proves each scenario does what its name says: a conflict appears, or does not,
// or goes away. It sits in the wrapper, outside the measured tree, so reading
// the conflicts adds no renders to the count.
let conflictCount = 0;

function ConflictProbe() {
  conflictCount = useConflicts().count;
  return null;
}

function Wrapper({ children }: { children: React.ReactElement }) {
  return (
    <PerfProviders>
      <>
        <ConflictProbe />
        {children}
      </>
    </PerfProviders>
  );
}

// Reach the context and the sheet the way the UI does, without mounting the
// chrome that is not under measurement.
let cycle: (artistId: string) => void;
let openDetail: (artist: DbArtist) => void;

function InterestControl() {
  const { cycleStatus } = useInterestCycle();
  cycle = cycleStatus;
  return null;
}

function DetailControl() {
  const detail = useArtistDetail();
  openDetail = (artist) => detail.openDetail(artist, 'collapsed');
  return null;
}

function ViaContext() {
  return (
    <>
      <InterestControl />
      <TimelineScreen />
    </>
  );
}

function ViaSheet() {
  return (
    <>
      <DetailControl />
      <TimelineScreen />
      <ArtistDetailSheet />
    </>
  );
}

type Case = { from: Record<string, InterestStatus>; artist: string; conflicts: [before: boolean, after: boolean] };

async function pressContext({ artist, conflicts }: Case): Promise<void> {
  await settle();
  expect(conflictCount > 0).toBe(conflicts[0]);
  await act(async () => { cycle(artist); });
  expect(conflictCount > 0).toBe(conflicts[1]);
}

async function pressSheet({ artist, conflicts }: Case): Promise<void> {
  await settle();
  expect(conflictCount > 0).toBe(conflicts[0]);
  const subject = getArtists(SLUG).find((a) => a.artistId === artist)!;
  await act(async () => { openDetail(subject); });
  await settle();
  // The timeline itself has no stars, so the sheet's is the only one.
  await act(async () => { fireEvent.press(screen.getByLabelText('Toggle interest')); });
  expect(conflictCount > 0).toBe(conflicts[1]);
}

// One press from each starting state: maybe → must see, or must see → none.
const CASES: (Case & { name: string })[] = [
  {
    name: 'starring an artist with no clash',
    from: { [RIVERS_OF_NIHIL]: 'maybe' },
    artist: RIVERS_OF_NIHIL,
    conflicts: [false, false],
  },
  {
    name: 'starring an artist into a conflict',
    from: { [CRYSTAL_LAKE]: 'maybe' },
    artist: CRYSTAL_LAKE,
    conflicts: [false, true],
  },
  {
    name: 'unstarring an artist out of a conflict',
    from: { [CRYSTAL_LAKE]: 'must_see' },
    artist: CRYSTAL_LAKE,
    conflicts: [true, false],
  },
];

// Controls: the same mount and settle, and the same sheet opening, with no
// press. Reassure measures a whole run, mount included, so a scenario's own
// figures do not say what the press cost. Its control's subtracted from it does.
test('timeline settled, no interest change (control)', async () => {
  await measureRenders(<ViaContext />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    beforeEach: startingFrom({}),
    scenario: settle,
  });
});

test('detail sheet opened, no interest change (control)', async () => {
  await measureRenders(<ViaSheet />, {
    ...MEASURE_OPTIONS,
    wrapper: Wrapper,
    beforeEach: startingFrom({}),
    scenario: async () => {
      await settle();
      const subject = getArtists(SLUG).find((a) => a.artistId === CRYSTAL_LAKE)!;
      await act(async () => { openDetail(subject); });
      await settle();
    },
  });
});

for (const c of CASES) {
  const { name, from } = c;
  test(`${name}, via the interest context`, async () => {
    await measureRenders(<ViaContext />, {
      ...MEASURE_OPTIONS,
      wrapper: Wrapper,
      beforeEach: startingFrom(from),
      scenario: () => pressContext(c),
    });
  });

  test(`${name}, via the detail sheet's star`, async () => {
    await measureRenders(<ViaSheet />, {
      ...MEASURE_OPTIONS,
      wrapper: Wrapper,
      beforeEach: startingFrom(from),
      scenario: () => pressSheet(c),
    });
  });
}
