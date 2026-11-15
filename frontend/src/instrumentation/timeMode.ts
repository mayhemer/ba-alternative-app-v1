import { getFestivalDays } from '../cache/cacheService';
import { setClockShift } from '../utils/clock';
import { festivalWeekTime } from './liveSimulation';
import { launchArgument } from './launchArguments';

// ── Time modes ────────────────────────────────────────────────────────────────
//
// Which "now" the app shows, set per build by EXPO_PUBLIC_TIME_MODE (eas.json):
//
// - native (unset, or named by a profile extending a simulated one, as `perf`):
//   the real clock. Production; no launch argument can move it.
// - live-simulation: every real week plays as the selected edition's festival
//   week (liveSimulation.ts). The development and preview builds.
// - controlled: a fixed instant, standing still for the whole launch, so a test
//   or a developer sees the same screen however long it takes. The instant is an
//   ISO time with its offset: the launch's `e2eNow` (launchArguments.ts) if it
//   names one, else the build's EXPO_PUBLIC_TIME_NOW; with neither, the real
//   clock. The E2E build, or any build made with both variables set.
//
// Only the app's "now" moves (utils/clock currentTimeMs); stored timestamps keep
// the real time (realTimeMs). StartupGate installs the mode for the selected
// edition before anything reads the clock, and again on an edition switch.

export type TimeMode = 'native' | 'live-simulation' | 'controlled';

type Shift = (realMs: number) => number;

/** The build's mode; a value it does not know fails, rather than quietly running native. */
export function parseTimeMode(value: string | undefined): TimeMode {
  switch (value) {
    case undefined:
    case '':
    case 'native':
      return 'native';
    case 'live-simulation':
    case 'controlled':
      return value;
    default:
      throw new Error(`EXPO_PUBLIC_TIME_MODE "${value}" is not a time mode (native, live-simulation, controlled)`);
  }
}

// Static member expressions: the only form Expo's Babel plugin inlines at build time.
const BUILD_TIME_MODE: TimeMode = parseTimeMode(process.env.EXPO_PUBLIC_TIME_MODE);
const BUILD_TIME_NOW: string | undefined = process.env.EXPO_PUBLIC_TIME_NOW;

type ShiftInputs = {
  /** Controlled time's instant (the launch's or the build's); read only in controlled mode. */
  controlledNow: string | null;
  /** The edition's first festival day, or undefined before its schedule is loaded. */
  firstFestivalDay: () => number | undefined;
};

/** The clock shift a mode runs; null for the real clock. */
export function clockShiftFor(mode: TimeMode, { controlledNow, firstFestivalDay }: ShiftInputs): Shift | null {
  switch (mode) {
    case 'native':
      return null;
    case 'controlled': {
      if (controlledNow === null) {
        return null;
      }
      const instant = Date.parse(controlledNow);
      if (Number.isNaN(instant)) {
        throw new Error(`controlled time "${controlledNow}" (e2eNow or EXPO_PUBLIC_TIME_NOW) is not an ISO time with an offset`);
      }
      return () => instant;
    }
    case 'live-simulation':
      // Read at every call: the edition's days arrive with its first load.
      return (realMs) => {
        const firstDay = firstFestivalDay();
        return firstDay === undefined ? realMs : festivalWeekTime(realMs, firstDay);
      };
  }
}

type InstallOptions = {
  mode: TimeMode;
  /** The build's EXPO_PUBLIC_TIME_NOW, for controlled time. */
  buildNow?: string;
  readArgument: (key: string) => string | null;
};

/** Controlled time's instant: the launch's, else the build's, else none. */
function controlledInstant(buildNow: string | undefined, readArgument: (key: string) => string | null): string | null {
  const fromLaunch = readArgument('e2eNow');
  if (fromLaunch !== null) {
    return fromLaunch;
  }
  return buildNow !== undefined && buildNow !== '' ? buildNow : null;
}

/** Sets the app's clock for the build's mode and the selected edition. */
export function installTimeMode(
  slug: string,
  { mode, buildNow, readArgument }: InstallOptions = { mode: BUILD_TIME_MODE, buildNow: BUILD_TIME_NOW, readArgument: launchArgument },
): void {
  setClockShift(clockShiftFor(mode, {
    controlledNow: mode === 'controlled' ? controlledInstant(buildNow, readArgument) : null,
    firstFestivalDay: () => getFestivalDays(slug)[0],
  }));
}
