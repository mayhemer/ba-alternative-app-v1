// ── Clock source ──────────────────────────────────────────────────────────────
// Single source of "now" for the whole app.
//
// Two reasons it is indirected rather than calling Date.now() at each site:
// simulating a point during the festival while developing off-season, and
// pinning time in tests. Both go through the same override.
//
// Code that *schedules* rather than *reads* (poll intervals, debounces) should
// take `now` as a parameter instead — see festivalConfig.getSyncInterval. That
// keeps the pure function testable without touching global state at all, which
// is how the backend does it (`activeSlugs(raw, now)`).

// Flip to simulate a specific instant during development.
const USE_TESTING_TIME: boolean = false;
// Festival time, with an explicit offset, so it is the same instant on any device.
const TESTING_TIME_VALUE: number = Date.parse('2024-08-08T14:08:00+02:00');

let override: number | null = USE_TESTING_TIME ? TESTING_TIME_VALUE : null;

export function currentTimeMs(): number {
  return override ?? Date.now();
}

/**
 * Pins "now" for tests, or resumes the real clock when passed null.
 *
 * Deliberately a setter rather than the old compile-time const: a test needs to
 * choose the instant per case, and a build-time flag cannot. Production never
 * calls this — the dev simulation above still works through the same field.
 */
export function setCurrentTimeMs(ms: number | null): void {
  override = ms;
}
