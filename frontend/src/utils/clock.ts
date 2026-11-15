// ── Clock source ──────────────────────────────────────────────────────────────
// Single source of "now" for the whole app.
//
// Two reasons it is indirected rather than calling Date.now() at each site: the
// builds' time modes (instrumentation/timeMode.ts: live simulation, a fixed
// instant for E2E or development), and pinning time in tests.
//
// Code that *schedules* rather than *reads* (poll intervals, debounces) should
// take `now` as a parameter instead — see festivalConfig.getSyncInterval. That
// keeps the pure function testable without touching global state at all, which
// is how the backend does it (`activeSlugs(raw, now)`).

// A test's pinned instant (setCurrentTimeMs); null on the real clock.
let override: number | null = null;

// A build's time mode (instrumentation/timeMode.ts) moves the clock the app
// shows: live simulation plays every real week as the festival week, controlled
// time stands at a fixed instant. Only "now" as the app shows it moves;
// realTimeMs() stays real.
let shift: ((realMs: number) => number) | null = null;

/** "Now" as the app shows it: festival time, the now pill, My plan, the timelines. */
export function currentTimeMs(): number {
  if (override !== null) {
    return override;
  }
  return shift !== null ? shift(Date.now()) : Date.now();
}

/**
 * Real time, never moved by a time mode: for timestamps that are stored or
 * compared with someone else's clock — a pick's updatedAt (merged against the
 * server's), a token's expiry (Cognito's), the lock-screen card (drawn by the
 * phone on its own clock).
 */
export function realTimeMs(): number {
  return override ?? Date.now();
}

/** Installs a time mode's mapping from real time to the app's; null for the real clock. */
export function setClockShift(fn: ((realMs: number) => number) | null): void {
  shift = fn;
}

/**
 * Pins "now" for tests, or resumes the real clock when passed null. Both clocks
 * stand at it, the shown and the real one. Only tests call this; a build that
 * should stand at an instant uses controlled time (instrumentation/timeMode.ts).
 */
export function setCurrentTimeMs(ms: number | null): void {
  override = ms;
}
