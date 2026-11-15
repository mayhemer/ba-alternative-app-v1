import { clockShiftFor, installTimeMode, parseTimeMode } from './timeMode';
import { currentTimeMs, realTimeMs, setClockShift } from '../utils/clock';

// ── Time modes ────────────────────────────────────────────────────────────────
//
// Dimensions: the build's mode (native, live simulation, controlled, a typo);
// controlled time's instant from the build (EXPO_PUBLIC_TIME_NOW) and from the
// launch (e2eNow): either, both, neither, unreadable; the edition's festival
// days for live simulation (loaded, not yet).
//
// Native is what production builds run: no launch argument may move its clock.

const REAL = Date.parse('2026-11-11T14:10:00+01:00');
const FROZEN_TEXT = '2025-08-06T14:10:00+02:00';
const FROZEN = Date.parse(FROZEN_TEXT);
const FIRST_DAY = Date.parse('2025-08-05T06:00:00+02:00');

const noDays = (): number | undefined => undefined;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(REAL);
});

afterEach(() => {
  setClockShift(null);
  jest.useRealTimers();
});

describe('the build\'s mode', () => {
  it('is native when the build sets none', () => {
    expect(parseTimeMode(undefined)).toBe('native');
  });

  it('is native when the build names it, as a profile extending a simulated one must', () => {
    expect(parseTimeMode('native')).toBe('native');
  });

  it('reads live simulation and controlled time', () => {
    expect(parseTimeMode('live-simulation')).toBe('live-simulation');
    expect(parseTimeMode('controlled')).toBe('controlled');
  });

  it('refuses a mode it does not know, rather than quietly running native', () => {
    expect(() => parseTimeMode('live-simulaton')).toThrow('live-simulaton');
  });
});

describe('the clock each mode runs', () => {
  it('native: the real clock, whatever the launch asks', () => {
    expect(clockShiftFor('native', { controlledNow: FROZEN_TEXT, firstFestivalDay: () => FIRST_DAY })).toBeNull();
  });

  it('controlled: the launch\'s instant, standing still', () => {
    const shift = clockShiftFor('controlled', { controlledNow: FROZEN_TEXT, firstFestivalDay: noDays });
    expect(shift?.(REAL)).toBe(FROZEN);
    expect(shift?.(REAL + 90_000)).toBe(FROZEN);
  });

  it('controlled, launched without an instant: the real clock', () => {
    expect(clockShiftFor('controlled', { controlledNow: null, firstFestivalDay: noDays })).toBeNull();
  });

  it('controlled, launched with an unreadable instant: fails, naming it', () => {
    expect(() => clockShiftFor('controlled', { controlledNow: 'Wednesday 14:10', firstFestivalDay: noDays }))
      .toThrow('Wednesday 14:10');
  });

  it('live simulation: the festival week\'s same weekday and wall-clock time', () => {
    const shift = clockShiftFor('live-simulation', { controlledNow: null, firstFestivalDay: () => FIRST_DAY });
    expect(shift?.(REAL)).toBe(FROZEN);
  });

  it('live simulation, before the edition\'s days are loaded: the real time', () => {
    const shift = clockShiftFor('live-simulation', { controlledNow: null, firstFestivalDay: noDays });
    expect(shift?.(REAL)).toBe(REAL);
  });
});

describe('installing a mode', () => {
  it('moves the app\'s clock and keeps the real one', () => {
    installTimeMode('ba2025', { mode: 'controlled', readArgument: (key) => (key === 'e2eNow' ? FROZEN_TEXT : null) });
    expect(currentTimeMs()).toBe(FROZEN);
    expect(realTimeMs()).toBe(REAL);
  });

  it('native reads no launch argument at all', () => {
    const readArgument = jest.fn(() => FROZEN_TEXT);
    installTimeMode('ba2025', { mode: 'native', readArgument });
    expect(readArgument).not.toHaveBeenCalled();
    expect(currentTimeMs()).toBe(REAL);
  });

  it('replaces the mode installed before it', () => {
    installTimeMode('ba2025', { mode: 'controlled', readArgument: () => FROZEN_TEXT });
    installTimeMode('ba2025', { mode: 'native', readArgument: () => null });
    expect(currentTimeMs()).toBe(REAL);
  });
});

describe('controlled time\'s instant: the build\'s, or the launch\'s', () => {
  const BUILD_TEXT = '2024-08-08T14:08:00+02:00';
  const BUILD = Date.UTC(2024, 7, 8, 12, 8);

  it('stands at the build\'s instant when the launch names none', () => {
    installTimeMode('ba2025', { mode: 'controlled', buildNow: BUILD_TEXT, readArgument: () => null });
    expect(currentTimeMs()).toBe(BUILD);
    jest.advanceTimersByTime(90_000);
    expect(currentTimeMs()).toBe(BUILD);
    expect(realTimeMs()).toBe(REAL + 90_000);
  });

  it('stands at the launch\'s instant when both name one', () => {
    installTimeMode('ba2025', { mode: 'controlled', buildNow: BUILD_TEXT, readArgument: (key) => (key === 'e2eNow' ? FROZEN_TEXT : null) });
    expect(currentTimeMs()).toBe(FROZEN);
  });

  it('runs the real clock when neither names one', () => {
    installTimeMode('ba2025', { mode: 'controlled', buildNow: undefined, readArgument: () => null });
    expect(currentTimeMs()).toBe(REAL);
  });

  it('fails on an unreadable build instant, naming it', () => {
    expect(() => installTimeMode('ba2025', { mode: 'controlled', buildNow: 'Thursday 14:08', readArgument: () => null }))
      .toThrow('Thursday 14:08');
  });

  it('is ignored by the other modes', () => {
    installTimeMode('ba2025', { mode: 'native', buildNow: BUILD_TEXT, readArgument: () => null });
    expect(currentTimeMs()).toBe(REAL);
  });
});
