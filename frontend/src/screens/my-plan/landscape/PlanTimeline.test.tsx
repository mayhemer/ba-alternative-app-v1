import React from 'react';
import { Platform, ScrollView } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlanTimeline } from './PlanTimeline';
import { PerfProviders } from '../../../../tests/setup/PerfProviders';
import { createDataCollector, populateCache } from '../../../cache/cacheService';
import { setCurrentTimeMs } from '../../../utils/clock';
import type { LayoutMode } from '../../../hooks/useLayoutMode';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../../types/backend';

import artistsFixture from '../../../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../../tests/fixtures/generated/ba2025/schedule.json';

// ── My plan's landscape timeline keeps the time it is centred on ──────────────
//
// Turning the phone keeps the time the screen is centred on: the timeline lands
// centred on the list's time, and tells My plan its own centre time for the turn
// back. The centre is a time at the scroller's own width, which on a phone in
// landscape is narrower than the window: the safe area insets it on both sides.
// A landing aimed at the window's width sits half the insets off (62 pt on an
// iPhone 17 Pro, about 22 min), and which width a landing used depended on
// whether the scroller was measured before the deferred landing ran — a set
// centred on one turn and its start centred on the next.
//
// The time is the screen's, kept by My plan: the timeline lands on it, and
// tells it a new one only for a landing of its own (a day without a kept time),
// a request (now, a set) or the end of the user's drag. A scroll event alone (a
// turn's relayout moves the scroller too) or a landing held at the window's
// edge never changes it, so turning without scrolling shows the same time.
//
// Jest lays nothing out and moves no scroller, so these pin the commands: every
// scrollTo issued to the horizontal scroller, and the centre time reported.
// Layout and scroll events are fired as the native scroller would. Dimensions:
//   when the scroller is measured — before the deferred landing runs, after it;
//   its width afterwards          — changed (a turn's passing sizes);
//   a scroll                      — an event alone, a drag's end, before a width change;
//   the kept time                 — free, past the window's end, none.
//
// A phone in landscape: an 874 pt window; the scroller measured 750 pt wide.
// The view window starts at 08:30, 170 pt an hour. Centring 20:07:30 (11 h
// 37.5 min into the window, 1976.25 pt) on 750 pt scrolls to 1976.25 − 375 =
// 1601.25; on the window's 874 pt it would be 1539.25.

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

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const NOW = Date.parse('2025-08-06T12:00:00+02:00');
const at = (hms: string): number => Date.parse(`2025-08-06T${hms}+02:00`);

const SCROLL_X = 'timeline-scroll-x';

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
  jest.mocked(ScrollView.prototype.scrollTo).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  setCurrentTimeMs(null);
});

type ScrollCommand = { x?: number; y?: number; animated?: boolean };
type MockScrollView = { props: { testID?: string }; scrollTo: (options: ScrollCommand) => void };

/** Every scrollTo issued to the horizontal scroller, oldest first. */
function scrollCommands(): ScrollCommand[] {
  const scrollTo = jest.mocked((ScrollView.prototype as MockScrollView).scrollTo);
  return scrollTo.mock.calls
    .filter((_, i) => (scrollTo.mock.contexts[i] as MockScrollView).props.testID === SCROLL_X)
    .map(([options]) => options);
}

/** Where the scroller was last told to go. */
function lastScrollX(): number | undefined {
  return scrollCommands().at(-1)?.x;
}

async function settle(): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
}

/** The scroller measured at `width`, as its native layout reports it. */
async function measure(width: number): Promise<void> {
  await fireEvent(screen.getByTestId(SCROLL_X), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 300 } } });
}

/** A scroll event at `x`, as any move of the scroller reports it. */
async function scrollEvent(x: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(SCROLL_X), { nativeEvent: { contentOffset: { x, y: 0 } } });
}

/** The user's drag, let go at `x`. */
async function dragTo(x: number): Promise<void> {
  await scrollEvent(x);
  await fireEvent(screen.getByTestId(SCROLL_X), 'scrollEndDrag', { nativeEvent: { contentOffset: { x, y: 0 } } });
}

const itNative = Platform.OS === 'web' ? it.skip : it;

async function mount(landingCentreMs: number | undefined, onCentreTime = jest.fn()) {
  await render(
    <PerfProviders>
      <PlanTimeline day={WED} level="all" onPullPastTop={() => undefined} landingCentreMs={landingCentreMs} onCentreTime={onCentreTime} />
    </PerfProviders>,
  );
  return onCentreTime;
}

describe('landing on the time the list was centred on', () => {
  it('centres it at the scroller\'s own width when measured before the deferred landing runs', async () => {
    await mount(at('20:07:30'));
    await measure(750);
    await settle();

    expect(lastScrollX()).toBe(1601.25);
  });

  it('centres it at the scroller\'s own width when measured after the deferred landing ran', async () => {
    await mount(at('20:07:30'));
    await settle();
    await measure(750);

    expect(lastScrollX()).toBe(1601.25);
  });

  it('never tells My plan back the time it was given', async () => {
    const onCentreTime = await mount(at('20:07:30'));
    await measure(750);
    await settle();

    expect(onCentreTime).not.toHaveBeenCalled();
  });
});

describe('a width change while the phone turns', () => {
  it('keeps the landing time centred at the new width', async () => {
    await mount(at('20:07:30'));
    await measure(750);
    await settle();

    // 400 pt wide: 1976.25 − 200.
    await measure(400);

    expect(lastScrollX()).toBe(1776.25);
  });

  it('keeps the time a drag left centred, not the landing time', async () => {
    const onCentreTime = await mount(at('20:07:30'));
    await measure(680);
    await settle();

    // Let go at 1020 on 680 pt: 425 + 1020 + 340 = 1785 pt, 10.5 h after
    // 06:00 = 16:30.
    await dragTo(1020);
    expect(onCentreTime).toHaveBeenLastCalledWith(at('16:30:00'), WED);

    // 340 pt wide: 16:30 is 8 h into the window (1360 pt), less 170.
    await measure(340);

    expect(lastScrollX()).toBe(1190);
  });

  // Web sends no drag events: there a scroll that is not the view's own counts once at rest.
  itNative('takes no time from a scroll event alone', async () => {
    const onCentreTime = await mount(at('20:07:30'));
    await measure(750);
    await settle();
    onCentreTime.mockClear();

    // The scroller moved by a relayout, no drag: still 20:07:30 at the next width.
    await scrollEvent(500);
    await measure(400);

    expect(onCentreTime).not.toHaveBeenCalled();
    expect(lastScrollX()).toBe(1776.25);
  });
});

describe('a time the window cannot centre', () => {
  it('keeps the time asked for, held at the window\'s end at every width', async () => {
    // 03:50 is 21 h 20 into the window (3626.67 pt); the window's end is 3315 pt.
    const onCentreTime = await mount(at('03:50:00') + 24 * 60 * 60 * 1000);
    await measure(750);
    await settle();
    // Held at 3315 − 750.
    expect(lastScrollX()).toBe(2565);

    // Wider: held at 3315 − 800; the time is still the one asked for, never read back.
    await measure(800);
    expect(lastScrollX()).toBe(2515);
    expect(onCentreTime).not.toHaveBeenCalled();
  });
});

describe('a day without a kept time', () => {
  it('lands where the day opens and tells My plan that time, once measured', async () => {
    const onCentreTime = await mount(undefined);
    await settle();
    expect(onCentreTime).not.toHaveBeenCalled();

    await measure(750);

    // The default landing's centre: whatever x it opened at, read at 750 pt.
    expect(onCentreTime).toHaveBeenCalledTimes(1);
  });
});
