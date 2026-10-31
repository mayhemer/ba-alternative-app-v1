import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as cacheService from '../../cache/cacheService';
import { StarSelector } from './StarSelector';
import { useOpenStarSelector, useStarSelectorActions, type MeasurableStar } from './StarSelectorContext';
import { useInterest, type InterestStatus } from './InterestContext';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';

// ── The star selector, opened by a star press ─────────────────────────────────
//
// A star press turns the pick one step and opens the selector beside the star,
// apart from it, confirming the change: the four states, the current one ringed
// (the ring moves there from the state before) and the others dimmed, its name
// above with a tick. A tap on a state sets it; another press on the star turns
// it again, the same selector staying open. It closes 1.8 s after the last tap
// (never while a finger is on it), or on a touch anywhere off it and off its
// star. Nothing around it is dimmed.
//
// Dimensions: the star's size (list row or artist sheet); the save (done or
// failed); time since the last tap.

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

let mockSlugCounter = 0;
let mockSlug = 'starselector0';
jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => mockSlug };
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

const ARTIST = 'a1';
// A list row's star on a 390 pt phone, mid-screen.
const LIST_STAR = { x: 322, y: 300, width: 26, height: 30 };

/** A star that reports where it is, as a real one does once laid out. */
function starAt(frame: typeof LIST_STAR): MeasurableStar {
  return { measureInWindow: (cb) => { cb(frame.x, frame.y, frame.width, frame.height); } };
}

let actions: ReturnType<typeof useStarSelectorActions>;
let status: InterestStatus;
let opened: ReturnType<typeof useOpenStarSelector>;

function Probe() {
  actions = useStarSelectorActions();
  status = useInterest().getStatus(ARTIST);
  opened = useOpenStarSelector();
  return null;
}

async function pressStar(size: 'small' | 'large' = 'small') {
  await render(
    <FeatureProviders>
      <Probe />
      <StarSelector />
    </FeatureProviders>,
  );
  await act(async () => {
    actions.pressStar({ artistId: ARTIST, size, star: starAt(LIST_STAR) });
  });
}

const selector = () => screen.queryByTestId('star-selector');
const info = () => within(screen.getByTestId('star-selector-info'));

beforeEach(() => {
  mockSlug = `starselector${++mockSlugCounter}`;
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('turns the pick one step and opens beside the star, naming the new state', async () => {
  await pressStar();

  expect(status).toBe('maybe');
  expect(selector()).toBeTruthy();
  expect(info().getByText('Maybe')).toBeTruthy();
});

it('confirms the change with a tick', async () => {
  await pressStar();

  expect(info().getByText('✓')).toBeTruthy();
});

it('remembers the state before the press, for the ring to move from', async () => {
  await pressStar();

  expect(opened).toMatchObject({ from: 'none' });
  expect(status).toBe('maybe');
});

it('dims every state but the current one', async () => {
  await pressStar();
  const opacity = (s: string) => screen.getByTestId(`star-selector-glyph-${s}`).props.style.opacity;

  expect(opacity('maybe')).toBe(1);
  for (const other of ['none', 'will_go', 'dont_go']) {
    expect(opacity(other)).toBe(0.5);
  }
});

it('marks the current state among the four', async () => {
  await pressStar();
  const sel = within(screen.getByTestId('star-selector'));

  expect(sel.getByLabelText('Maybe').props.accessibilityState).toMatchObject({ selected: true });
  for (const other of ['Not marked', 'Must see!', "Don't go"]) {
    expect(sel.getByLabelText(other).props.accessibilityState).toMatchObject({ selected: false });
  }
});

it('sets the state tapped in it, skipping the ones between', async () => {
  await pressStar();

  await act(async () => { fireEvent.press(screen.getByLabelText("Don't go")); });

  expect(status).toBe('dont_go');
  expect(info().getByText("Don't go")).toBeTruthy();
});

it('leaves the star to the star: it draws no star of its own', async () => {
  await pressStar();

  expect(within(screen.getByTestId('star-selector')).queryByLabelText('Toggle interest')).toBeNull();
});

it('turns the pick again on another press of its star, staying the same selector', async () => {
  await pressStar();
  const first = opened!.id;

  await act(async () => {
    actions.pressStar({ artistId: ARTIST, size: 'small', star: starAt(LIST_STAR) });
  });

  expect(status).toBe('will_go');
  expect(opened!.id).toBe(first);
  expect(info().getByText('Must see!')).toBeTruthy();
});

it('opens afresh, from the state before, for another artist\'s star', async () => {
  await pressStar();
  const first = opened!.id;
  await act(async () => { actions.closeOnTouchOutside(20, 40); });

  await act(async () => {
    actions.pressStar({ artistId: 'a2', size: 'small', star: starAt({ ...LIST_STAR, y: 381 }) });
  });

  expect(opened).toMatchObject({ artistId: 'a2', from: 'none' });
  expect(opened!.id).not.toBe(first);
});

it('stays open on a touch on its star, or within the star\'s reach', async () => {
  await pressStar();

  await act(async () => { actions.closeOnTouchOutside(LIST_STAR.x + 13, LIST_STAR.y + 15); });
  await act(async () => { actions.closeOnTouchOutside(LIST_STAR.x - 20, LIST_STAR.y + 15); });

  expect(selector()).toBeTruthy();
});

it('closes on a touch between itself and the star\'s reach', async () => {
  await pressStar();

  // Its right end is 34 pt left of the star; the star reaches 25 pt.
  await act(async () => { actions.closeOnTouchOutside(LIST_STAR.x - 30, LIST_STAR.y + 15); });

  expect(selector()).toBeNull();
});

it('closes by itself 1.8 s after the last tap', async () => {
  await pressStar();

  await act(async () => { jest.advanceTimersByTime(1700); });
  expect(selector()).toBeTruthy();

  // A tap restarts the wait.
  await act(async () => { fireEvent.press(screen.getByLabelText('Must see!')); });
  await act(async () => { jest.advanceTimersByTime(1700); });
  expect(selector()).toBeTruthy();

  await act(async () => { jest.advanceTimersByTime(100); });
  expect(selector()).toBeNull();
});

it('never closes while a finger is on it', async () => {
  await pressStar();

  await act(async () => { fireEvent(screen.getByTestId('star-selector'), 'touchStart'); });
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(selector()).toBeTruthy();

  await act(async () => { fireEvent(screen.getByTestId('star-selector'), 'touchEnd'); });
  await act(async () => { jest.advanceTimersByTime(1800); });
  expect(selector()).toBeNull();
});

it('says when the pick could not be saved, and stays open', async () => {
  jest.spyOn(cacheService, 'setInterest').mockRejectedValueOnce(new Error('disk full'));
  await pressStar();

  expect(info().getByText('⚠ not saved')).toBeTruthy();
  expect(info().queryByText('✓')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(selector()).toBeTruthy();
});

it('closes on a touch anywhere else', async () => {
  await pressStar();

  await act(async () => { actions.closeOnTouchOutside(20, 40); });

  expect(selector()).toBeNull();
});

it('stays open on a touch on itself', async () => {
  await pressStar();

  // On the capsule, over its first state: it starts 40 + 182 + 6 pt left of the star.
  await act(async () => { actions.closeOnTouchOutside(LIST_STAR.x - 220, LIST_STAR.y + 15); });

  expect(selector()).toBeTruthy();
});

it('dims nothing around it, not even for the artist sheet\'s star', async () => {
  await pressStar('large');

  expect(screen.queryByTestId('star-selector-dim')).toBeNull();
});

it('closes when asked, as the list does when it scrolls', async () => {
  await pressStar();

  await act(async () => { actions.close(); });

  expect(selector()).toBeNull();
});
