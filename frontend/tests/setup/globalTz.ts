// ── A device far from the festival, for every test process ────────────────────
//
// The app shows festival time (Europe/Prague) whatever zone the device is in —
// see src/utils/festivalTime. Running the suite in New York makes that a tested
// property: anything that reads the device's clock instead (getHours, getDate,
// toLocale…) puts day boundaries and labels six hours off, and fails. In Prague
// the two would agree and such a regression would pass unnoticed.
//
// Pinned rather than left to the runner, so CI and a laptop run the same suite.
// Set here rather than in each npm script so a bare `npx jest` gets it too.
// Workers are spawned after global setup and inherit the environment.

export default function globalTz(): void {
  process.env.TZ = 'America/New_York';
}
