import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseTimelineScreen } from '../BaseTimelineScreen';
import { LaneOrderPanel } from './LaneOrderPanel';
import { PerfProviders } from '../../../../tests/setup/PerfProviders';
import { rendersSinceReset, resetRenders } from '../../../../tests/setup/countRenders';
import { createDataCollector, populateCache } from '../../../cache/cacheService';
import { getUiState, setLaneOrder, setLensScope, setSelectedDay } from '../../../store/uiStatePersistence';
import { setCurrentTimeMs } from '../../../utils/clock';
import { DEFAULT_SCOPE } from '../../../lib/interestUtils';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../../types/backend';

import artistsFixture from '../../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Changing the order of a timeline's lanes ──────────────────────────────────
//
// A long press on the timeline opens the order panel; a row moved there moves
// its lane at once, and is remembered per screen.
//
// Dimensions, and the corner cases tested for each:
//   screen — Program (its five stages, "Stage order") or Support Program (its
//            eleven categories, "Category order"), each with its own order
//   move   — a drag of a row's handle; a screen reader's move up / down; one
//            past the end of the list (nothing moves)
//   saved  — an order saved earlier (a fresh mount follows it)
//   cost   — opening the panel renders no lane; a move renders only the
//            titles that change place
//
// Wednesday's Program lanes, in category order: Marshall, Sea Shepherd,
// Obscure, KAL stage, Octagon, each 32 + 70 = 102 tall. Each case uses its own
// screenKey, so the remembered state cannot leak between them.

jest.mock('../../../store/AppContext', () => {
  const actual = jest.requireActual('../../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

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

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const NOW = Date.parse('2025-08-06T12:00:00+02:00');

const playable = (a: DbArtist): boolean => a.isPlayable;
const support = (a: DbArtist): boolean => !a.isPlayable;
const NoBottomBar = (): null => null;

const PROGRAM_STAGES = ['Marshall', 'Sea Shepherd', 'Obscure', 'KAL stage', 'Octagon'];
const SUPPORT_CATEGORIES = ['Meet & Greet', 'Exhibition', 'Creepy hole', 'Museum', 'Contest', 'Lectures and workshops',
  'Post-apo', 'Jazz wine bar', 'Brutal kids', 'Horror cinema', 'Clinic'];

beforeAll(() => {
  setCurrentTimeMs(NOW);
  const collector = createDataCollector();
  collector.setArtists(artistsFixture as unknown as DbArtist[]);
  collector.setCategories(categoriesFixture as unknown as DbCategory[]);
  collector.setStages(stagesFixture as unknown as DbStage[]);
  collector.setEvents(scheduleFixture as unknown as DbEvent[]);
  populateCache('ba2025', collector.build(), NOW);
});

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'performance', 'hrtime', 'Date'] });
  await AsyncStorage.clear();
  setLensScope(DEFAULT_SCOPE);
  setCurrentTimeMs(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  setCurrentTimeMs(null);
});

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  }
}

async function mount(screenKey: string, filterArtist = playable): Promise<void> {
  setSelectedDay(screenKey, WED);
  await render(
    <PerfProviders>
      <>
        <BaseTimelineScreen title="Timeline" screenKey={screenKey} BottomBarComponent={NoBottomBar} filterArtist={filterArtist} />
        <LaneOrderPanel />
      </>
    </PerfProviders>,
  );
  await settle();
}

async function openPanel(): Promise<void> {
  await act(async () => { fireEvent(screen.getByTestId('timeline-canvas'), 'longPress'); });
}

async function closePanel(): Promise<void> {
  await act(async () => { fireEvent.press(screen.getByTestId('lane-order-close')); });
}

/** The panel's rows, top to bottom, by name: each row's handle is "Move <name>". */
function panelRows(): string[] {
  return screen.getAllByLabelText(/^Move /).map((handle) => (handle.props.accessibilityLabel as string).slice('Move '.length));
}

function handleOf(name: string): TestInstance {
  return screen.getByLabelText(`Move ${name}`);
}

/** A lane title's distance from the top of the lane stack. */
function titleTop(name: string): unknown {
  for (let n: TestInstance | null = screen.getByText(name); n !== null; n = n.parent) {
    const style = StyleSheet.flatten(n.props.style) as { position?: string; top?: unknown } | undefined;
    if (style?.position === 'absolute' && typeof style.top === 'number') {
      return style.top;
    }
  }
  throw new Error(`no positioned view above ${name}`);
}

/** A screen reader's move of a row: one place up or down. */
async function moveBy(name: string, action: 'moveUp' | 'moveDown'): Promise<void> {
  await act(async () => { fireEvent(handleOf(name), 'accessibilityAction', { nativeEvent: { actionName: action } }); });
}

/** A finger on a row's handle, moved `dy` down (up when negative) and lifted. */
async function drag(name: string, dy: number): Promise<void> {
  const handle = handleOf(name);
  let t = 1000;
  let previousY = 400;
  const touch = (y: number) => {
    t += 16;
    const prev = previousY;
    previousY = y;
    return {
      nativeEvent: { pageX: 300, pageY: y, locationX: 10, locationY: 10, timestamp: t, touches: [], changedTouches: [], identifier: 0 },
      touchHistory: {
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: t,
        touchBank: [{
          touchActive: true,
          startPageX: 300, startPageY: 400, startTimeStamp: 1000,
          currentPageX: 300, currentPageY: y, currentTimeStamp: t,
          previousPageX: 300, previousPageY: prev, previousTimeStamp: t - 16,
        }],
      },
    };
  };
  await act(async () => { fireEvent(handle, 'responderGrant', touch(400)); });
  await act(async () => { fireEvent(handle, 'responderMove', touch(400 + dy / 2)); });
  await act(async () => { fireEvent(handle, 'responderMove', touch(400 + dy)); });
  await act(async () => { fireEvent(handle, 'responderRelease', touch(400 + dy)); });
}

describe('opening the panel', () => {
  it('opens the stage order on a long press on the Program, its stages in their order', async () => {
    await mount('order-open');
    expect(screen.queryByText('Stage order')).toBeNull();
    await openPanel();
    expect(screen.getByText('Stage order')).toBeTruthy();
    expect(screen.getByText('Every day')).toBeTruthy();
    expect(panelRows()).toEqual(PROGRAM_STAGES);
  });

  it('opens the category order on the Support Program, every support category of the festival listed', async () => {
    // The Support Program is known by its screen key, as search knows it.
    await mount('support', support);
    await openPanel();
    expect(screen.getByText('Category order')).toBeTruthy();
    expect(panelRows()).toEqual(SUPPORT_CATEGORIES);
  });

  it('closes on ✕ and keeps the order', async () => {
    await mount('order-close');
    await openPanel();
    await moveBy('Marshall', 'moveDown');
    await closePanel();
    expect(screen.queryByText('Stage order')).toBeNull();
    expect(titleTop('Sea Shepherd')).toBe(0);
    expect(titleTop('Marshall')).toBe(102);
  });
});

describe('moving a lane', () => {
  it('moves a stage down a place: the list, the lanes and the saved order follow', async () => {
    await mount('order-down');
    await openPanel();
    await moveBy('Marshall', 'moveDown');
    expect(panelRows()).toEqual(['Sea Shepherd', 'Marshall', 'Obscure', 'KAL stage', 'Octagon']);
    expect(getUiState('laneOrder')['order-down']).toEqual(['2', '1', '3', '4', '5']);
    await closePanel();
    expect(titleTop('Sea Shepherd')).toBe(0);
    expect(titleTop('Marshall')).toBe(102);
    expect(titleTop('Obscure')).toBe(204);
  });

  it('moves a stage up a place', async () => {
    await mount('order-up');
    await openPanel();
    await moveBy('Octagon', 'moveUp');
    expect(panelRows()).toEqual(['Marshall', 'Sea Shepherd', 'Obscure', 'Octagon', 'KAL stage']);
  });

  it('moves nothing past the top of the list', async () => {
    await mount('order-top');
    await openPanel();
    await moveBy('Marshall', 'moveUp');
    expect(panelRows()).toEqual(PROGRAM_STAGES);
    expect(getUiState('laneOrder')['order-top']).toBeUndefined();
  });

  it('moves nothing past the bottom of the list', async () => {
    await mount('order-bottom');
    await openPanel();
    await moveBy('Octagon', 'moveDown');
    expect(panelRows()).toEqual(PROGRAM_STAGES);
  });

  it('drops a dragged stage where the finger lifts: two rows down (108) puts it third', async () => {
    await mount('order-drag');
    await openPanel();
    await drag('Marshall', 108);
    expect(panelRows()).toEqual(['Sea Shepherd', 'Obscure', 'Marshall', 'KAL stage', 'Octagon']);
    expect(getUiState('laneOrder')['order-drag']).toEqual(['2', '3', '1', '4', '5']);
  });

  it('leaves a stage dragged under half a row (26) where it was', async () => {
    await mount('order-drag-short');
    await openPanel();
    await drag('Sea Shepherd', 26);
    expect(panelRows()).toEqual(PROGRAM_STAGES);
  });

  it('saves the order under its own screen only', async () => {
    const before = getUiState('laneOrder');
    await mount('order-own');
    await openPanel();
    await moveBy('Marshall', 'moveDown');
    expect(getUiState('laneOrder')).toEqual({ ...before, 'order-own': ['2', '1', '3', '4', '5'] });
  });
});

describe('a saved order', () => {
  it('lays the lanes out in it on a fresh mount', async () => {
    setLaneOrder('order-saved', ['5', '4', '3', '2', '1']);
    await mount('order-saved');
    expect(titleTop('Octagon')).toBe(0);
    expect(titleTop('Marshall')).toBe(408);
  });
});

describe('render counts', () => {
  it('opening the panel renders no lane, title or block', async () => {
    await mount('order-count-open');
    resetRenders();
    await openPanel();
    expect(rendersSinceReset()).toEqual({});
  });

  it('moving a stage renders only the two titles that change place', async () => {
    await mount('order-count-move');
    await openPanel();
    resetRenders();
    await moveBy('Marshall', 'moveDown');
    await settle();
    expect(rendersSinceReset()).toEqual({ 'title-1': 1, 'title-2': 1 });
  });
});
