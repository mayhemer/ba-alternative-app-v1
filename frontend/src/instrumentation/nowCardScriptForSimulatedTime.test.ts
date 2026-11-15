import { nowCardScriptForSimulatedTime } from './nowCardScriptForSimulatedTime';
import type { NowCardSegment } from '../lib/nowCard';

// ── The lock-screen card's script, moved onto the phone's real clock ─────────
//
// Dimensions: the offset (none: the real clock; some: a simulated time mode);
// the segment's state (live with a next set; a break before one).

const HOUR = 60 * 60 * 1000;
const live = { eventId: 'l', name: 'Gojira', stage: 'Octagon', timeText: '19:00–20:00', start: 19 * HOUR, end: 20 * HOUR };
const next = { eventId: 'n', name: 'Batushka', stage: 'Marshall', timeText: '19:40–20:40', start: 19 * HOUR + 40 * 60_000, end: 20 * HOUR + 40 * 60_000 };
const script: NowCardSegment[] = [
  { from: 19 * HOUR, to: 20 * HOUR, state: { kind: 'live', live, next, nextClashes: true, more: 1 } },
];

it('moves the segment and both of its sets, and keeps the rest', () => {
  expect(nowCardScriptForSimulatedTime(script, 2 * HOUR)).toEqual([
    {
      from: 21 * HOUR,
      to: 22 * HOUR,
      state: {
        kind: 'live',
        live: { ...live, start: 21 * HOUR, end: 22 * HOUR },
        next: { ...next, start: 21 * HOUR + 40 * 60_000, end: 22 * HOUR + 40 * 60_000 },
        nextClashes: true,
        more: 1,
      },
    },
  ]);
});

it('moves a break and the set it waits for', () => {
  const pause: NowCardSegment[] = [{ from: 18 * HOUR, to: 19 * HOUR, state: { kind: 'break', next: live } }];
  expect(nowCardScriptForSimulatedTime(pause, -HOUR)).toEqual([
    { from: 17 * HOUR, to: 18 * HOUR, state: { kind: 'break', next: { ...live, start: 18 * HOUR, end: 19 * HOUR } } },
  ]);
});

it('hands back the same script on the real clock', () => {
  expect(nowCardScriptForSimulatedTime(script, 0)).toBe(script);
});
