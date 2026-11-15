import { currentTimeMs, realTimeMs, setClockShift, setCurrentTimeMs } from './clock';

// ── The app's clock ───────────────────────────────────────────────────────────
//
// Dimensions: a time mode's shift (none, a shift); a test's pinned instant
// (none, pinned). The shift moves only "now" as the app shows it
// (currentTimeMs); stored and server-compared timestamps keep the real time
// (realTimeMs). A pinned instant is both, whatever the shift.

const REAL = Date.parse('2026-11-12T10:00:00+01:00');
const FROZEN = Date.parse('2025-08-06T14:10:00+02:00');
const PINNED = Date.parse('2024-08-08T14:08:00+02:00');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(REAL);
});

afterEach(() => {
  setClockShift(null);
  setCurrentTimeMs(null);
  jest.useRealTimers();
});

it('reads the real time with no shift', () => {
  expect(currentTimeMs()).toBe(REAL);
  expect(realTimeMs()).toBe(REAL);
});

it('moves only the shown time with a shift, and leaves the real time real', () => {
  setClockShift(() => FROZEN);
  expect(currentTimeMs()).toBe(FROZEN);
  expect(realTimeMs()).toBe(REAL);
});

it('hands the shift the real time', () => {
  setClockShift((realMs) => realMs + 60_000);
  jest.setSystemTime(REAL + 5_000);
  expect(currentTimeMs()).toBe(REAL + 65_000);
});

it('goes back to the real time when the shift is removed', () => {
  setClockShift(() => FROZEN);
  setClockShift(null);
  expect(currentTimeMs()).toBe(REAL);
});

it('pins both times to a test\'s instant, whatever the shift', () => {
  setClockShift(() => FROZEN);
  setCurrentTimeMs(PINNED);
  expect(currentTimeMs()).toBe(PINNED);
  expect(realTimeMs()).toBe(PINNED);
});
