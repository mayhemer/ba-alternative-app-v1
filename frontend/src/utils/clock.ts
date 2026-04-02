// ── Clock source ──────────────────────────────────────────────────────────────
// Single source of "now" for the whole app.
// Flip USE_TESTING_TIME to simulate a specific point in time during development.

const USE_TESTING_TIME: boolean = true;
const TESTING_TIME_VALUE: number = (new Date(2024, 7, 6, 18, 8)).getTime();

export function currentTimeMs(): number {
  return USE_TESTING_TIME ? TESTING_TIME_VALUE : Date.now();
}
