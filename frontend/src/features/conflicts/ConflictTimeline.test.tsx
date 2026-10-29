import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { ConflictTimeline } from './ConflictTimeline';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';
import { createDataCollector, populateCache } from '../../cache/cacheService';
import { getCategoryLocalized } from '../../utils/localization';
import { getFestivalDayStart } from '../../utils/festivalTime';
import { setCurrentTimeMs } from '../../utils/clock';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── The conflict sheet's timeline ─────────────────────────────────────────────
//
// Only the sets it is given, each in its own category's lane, bands and support
// programme alike: the sheet shows one clash group, from both timelines.

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
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

const ARTISTS = artistsFixture as unknown as DbArtist[];
const CATEGORIES = categoriesFixture as unknown as DbCategory[];
const EVENTS = scheduleFixture as unknown as DbEvent[];
const artistOf = (e: DbEvent): DbArtist => ARTISTS.find((a) => a.artistId === e.artistId)!;
const laneTitle = (e: DbEvent): string =>
  getCategoryLocalized(CATEGORIES.find((c) => c.categoryId === e.categoryId)!.localized, 'title');

// From the real schedule: a band, a support-programme set on the same day, and
// another band on the band's own stage lane that is not part of the group.
const band = EVENTS.find((e) => artistOf(e)?.isPlayable === true)!;
const day = getFestivalDayStart(band.dateFrom);
const support = EVENTS.find((e) => artistOf(e)?.isPlayable === false && getFestivalDayStart(e.dateFrom) === day && e.categoryId !== band.categoryId)!;
const outsider = EVENTS.find((e) => e.eventId !== band.eventId && e.categoryId === band.categoryId && getFestivalDayStart(e.dateFrom) === day)!;

beforeAll(() => {
  const collector = createDataCollector();
  collector.setArtists(ARTISTS);
  collector.setCategories(CATEGORIES);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(EVENTS);
  populateCache('ba2025', collector.build(), band.dateFrom);
});

async function renderGroup(onBlockPress = jest.fn()) {
  await render(
    <FeatureProviders>
      <ConflictTimeline events={[band, support]} onBlockPress={onBlockPress} />
    </FeatureProviders>,
  );
  return onBlockPress;
}

it('found the sets it needs in the fixture', () => {
  expect([band, support, outsider].every((e) => e !== undefined)).toBe(true);
});

it('shows the group\'s sets from both timelines, each in its lane', async () => {
  await renderGroup();
  expect(screen.getAllByText(artistOf(band).name).length).toBeGreaterThan(0);
  expect(screen.getAllByText(artistOf(support).name).length).toBeGreaterThan(0);
  expect(screen.getByText(laneTitle(band))).toBeTruthy();
  expect(screen.getByText(laneTitle(support))).toBeTruthy();
});

it('leaves out every other set, even on the same lane', async () => {
  await renderGroup();
  expect(screen.queryByText(artistOf(outsider).name)).toBeNull();
});

it('opens a set when its block is tapped', async () => {
  const onBlockPress = await renderGroup();
  await fireEvent.press(screen.getAllByText(artistOf(band).name)[0]);
  expect(onBlockPress).toHaveBeenCalledWith(band, artistOf(band));
});

// ── What it draws ─────────────────────────────────────────────────────────────
//
// The style values handed to its lanes, titles and blocks, worked out by hand
// from the fixture's times: 170 px per hour from the day's 06:00, a lane 70 tall
// per row, a 32 px title strip above each lane. The sheet is 700 wide here
// (the test window's 750, capped at MAX_CONTENT_WIDTH).

type Style = Record<string, unknown>;
const styleOf = (node: TestInstance): Style => (StyleSheet.flatten(node.props.style) ?? {}) as Style;

function viewAbove(node: TestInstance, test: (style: Style) => boolean): Style {
  for (let n: TestInstance | null = node.parent; n !== null; n = n.parent) {
    if (n.type === 'View' && test(styleOf(n))) {
      return styleOf(n);
    }
  }
  throw new Error('no such view above the node');
}

const blockOf = (name: string): Style =>
  viewAbove(screen.getAllByText(name)[0], (s) => s.position === 'absolute' && typeof s.width === 'number' && typeof s.height === 'number');
const laneOf = (name: string): Style =>
  viewAbove(screen.getAllByText(name)[0], (s) => s.borderBottomWidth === 2 && typeof s.height === 'number');
const titleOf = (title: string): Style =>
  viewAbove(screen.getByText(title), (s) => s.position === 'absolute' && typeof s.top === 'number');

const byId = (eventId: string): DbEvent => EVENTS.find((e) => e.eventId === eventId)!;

describe('what it draws', () => {
  // CRYSTAL LAKE (Sea Shepherd, 14:00–14:40) and EXORCIZPHOBIA (Obscure,
  // 14:30–15:05), Wednesday.
  const CLASH = [byId('7020'), byId('7022')];

  it('cuts the day to the clash, widened evenly to the sheet', async () => {
    await render(<FeatureProviders><ConflictTimeline events={CLASH} onBlockPress={jest.fn()} /></FeatureProviders>);
    // 13:30–15:35 (half an hour either side) is 354 px; widened to 700 around
    // its middle, 14:32:30, which is 8 h 32 min 30 s after 06:00.
    const range = screen.getByTestId('conflict-timeline-range');
    expect(styleOf(range).width).toBeCloseTo(700);
    const canvas = styleOf(range.children[0] as TestInstance);
    expect(canvas.transform).toEqual([{ translateX: expect.closeTo(-(8.5417 * 170 - 350), 1) }]);
  });

  it('gives each set a lane of its own category, one row each, titled in order', async () => {
    await render(<FeatureProviders><ConflictTimeline events={CLASH} onBlockPress={jest.fn()} /></FeatureProviders>);
    expect(laneOf('CRYSTAL LAKE').height).toBe(70);
    expect(laneOf('EXORCIZPHOBIA').height).toBe(70);
    expect([titleOf('Sea Shepherd').top, titleOf('Obscure').top]).toEqual([0, 102]);
    expect(blockOf('EXORCIZPHOBIA').left).toBeCloseTo(8.5 * 170);
    expect(blockOf('EXORCIZPHOBIA').width).toBeCloseTo(35 * 170 / 60);
  });

  it('stacks overlapping sets of one category in rows', async () => {
    // LINOCUT LABORATORY and LOCAL ART BRUTAL WORKSHOPS, Lectures and workshops,
    // both Wednesday 10:00–17:00.
    const workshops = EVENTS.filter((e) => ['LINOCUT LABORATORY', 'LOCAL ART BRUTAL WORKSHOPS'].includes(artistOf(e)?.name ?? '')
      && getFestivalDayStart(e.dateFrom) === Date.parse('2025-08-06T06:00:00+02:00'));
    expect(workshops).toHaveLength(2);
    await render(<FeatureProviders><ConflictTimeline events={workshops} onBlockPress={jest.fn()} /></FeatureProviders>);
    expect(laneOf('LINOCUT LABORATORY').height).toBe(140);
    expect([blockOf('LINOCUT LABORATORY').top, blockOf('LOCAL ART BRUTAL WORKSHOPS').top].sort()).toEqual([0, 70]);
  });
});

// ── Its now line follows the minute clock ─────────────────────────────────────

describe('now', () => {
  /** Where the lanes' now lines are drawn: their live animated left. */
  function nowLinesX(): number[] {
    const lines: number[] = [];
    const walk = (node: TestInstance): void => {
      const animated = node.props.jestAnimatedStyle?.value as { left?: number } | undefined;
      if (node.type === 'View' && animated?.left !== undefined) {
        lines.push(animated.left);
      }
      node.children.forEach((child) => { if (typeof child !== 'string') { walk(child); } });
    };
    walk(screen.getByTestId('conflict-timeline'));
    return lines;
  }

  afterEach(() => {
    setCurrentTimeMs(null);
    jest.useRealTimers();
  });

  it('moves while the sheet is open', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
    setCurrentTimeMs(Date.parse('2025-08-06T14:20:00+02:00'));
    await render(<FeatureProviders><ConflictTimeline events={[byId('7020'), byId('7022')]} onBlockPress={jest.fn()} /></FeatureProviders>);
    // 14:20 is 8 h 20 after 06:00; one line per lane, two lanes.
    expect(nowLinesX().map((x) => Math.round(x * 100) / 100)).toEqual([1416.67, 1416.67]);
    setCurrentTimeMs(Date.parse('2025-08-06T14:21:00+02:00'));
    await act(async () => { await jest.advanceTimersByTimeAsync(60 * 1000); });
    expect(nowLinesX().map((x) => Math.round(x * 100) / 100)).toEqual([1419.5, 1419.5]);
  });
});
