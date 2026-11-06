import React from 'react';
import { AppState, Platform } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { NowCardSyncView } from './NowCardSync';
import { getNowCardPermission, requestNowCardPermission, setNowCardScript } from '../../modules/now-card';
import { setCurrentTimeMs } from '../utils/clock';
import { getFestivalDayStart } from '../utils/festivalTime';
import type { NowCardSegment } from '../lib/nowCard';

// ── Keeping the lock-screen now card in step with the app ─────────────────────
//
// Dimensions: the script (first, changed, unchanged); the app coming to the
// front; Android's notification permission (not asked yet, granted) on a
// festival day with a Must-see to come, and on a day without; the platform
// (only Android asks: an iOS Live Activity needs no permission).

jest.mock('../../modules/now-card', () => ({
  nowCardAvailable: true,
  setNowCardScript: jest.fn(async () => undefined),
  getNowCardPermission: jest.fn(async () => 'granted'),
  requestNowCardPermission: jest.fn(async () => 'granted'),
}));

const setScript = setNowCardScript as jest.Mock;
const getPermission = getNowCardPermission as jest.Mock;
const requestPermission = requestNowCardPermission as jest.Mock;

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const DAYS = [getFestivalDayStart(at(7, '12:00'))];

const SET = { eventId: 'e1', name: 'Gojira', stage: 'Octagon', timeText: '19:00–20:00', start: at(7, '19:00'), end: at(7, '20:00') };
const SCRIPT: NowCardSegment[] = [
  { from: at(7, '08:00'), to: at(7, '19:00'), state: { kind: 'break', next: SET } },
  { from: at(7, '19:00'), to: at(7, '20:00'), state: { kind: 'live', live: SET, clash: null, more: 0 } },
];
const OTHER_SCRIPT: NowCardSegment[] = [SCRIPT[1]];

let appStateListener: ((state: string) => void) | null = null;

beforeEach(() => {
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, listener: (state: string) => void) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
  getPermission.mockResolvedValue('granted');
  setCurrentTimeMs(at(7, '10:00'));
});

afterEach(() => {
  setCurrentTimeMs(null);
});

async function settle(): Promise<void> {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

it('hands the card its script, with its words and tap link', async () => {
  await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(setScript).toHaveBeenCalledTimes(1);
  expect(setScript).toHaveBeenCalledWith({
    version: 1,
    segments: SCRIPT,
    strings: { live: 'LIVE', next: 'NEXT UP', nextShort: 'NEXT', over: 'Today\'s Must-sees are over', channel: 'Lock-screen now card' },
    url: 'ba://my-plan/now',
  });
});

it('hands it again when the script changes, and not when it stays the same', async () => {
  const { rerender } = await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  await rerender(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(setScript).toHaveBeenCalledTimes(1);
  await rerender(<NowCardSyncView script={OTHER_SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(setScript).toHaveBeenCalledTimes(2);
  expect(setScript.mock.calls[1][0].segments).toBe(OTHER_SCRIPT);
});

it('hands it again when the app comes to the front: that is the card\'s refresh', async () => {
  await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  await act(async () => { appStateListener?.('background'); });
  expect(setScript).toHaveBeenCalledTimes(1);
  await act(async () => { appStateListener?.('active'); });
  await settle();
  expect(setScript).toHaveBeenCalledTimes(2);
});

it('asks for the notification permission on a festival day, on Android only', async () => {
  getPermission.mockResolvedValue('undetermined');
  await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(requestPermission).toHaveBeenCalledTimes(Platform.OS === 'android' ? 1 : 0);
});

it('does not ask once the permission is answered', async () => {
  getPermission.mockResolvedValue('granted');
  await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(requestPermission).not.toHaveBeenCalled();
});

it('does not ask on a day without a Must-see to come', async () => {
  getPermission.mockResolvedValue('undetermined');
  setCurrentTimeMs(at(7, '21:00'));
  await render(<NowCardSyncView script={SCRIPT} festivalDays={DAYS} />);
  await settle();
  expect(requestPermission).not.toHaveBeenCalled();
});
