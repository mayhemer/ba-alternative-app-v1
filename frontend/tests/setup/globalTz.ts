// ── Festival time zone for every test process ─────────────────────────────────
//
// Festival days start at 06:00 *local* time (timelineLayout.getFestivalDayStart),
// so the same pinned instant falls on a different festival day — and a different
// timeline — in a runner's UTC than on a laptop in Prague. Measured over the
// ba2025 schedule: 0 events outside the visible 08:30–04:00 window in
// Europe/Prague, 48 in UTC. Pinning the zone makes CI and local runs test the
// same screens.
//
// Set here rather than in each npm script so a bare `npx jest` gets it too.
// Workers are spawned after global setup and inherit the environment.

export default function globalTz(): void {
  process.env.TZ = 'Europe/Prague';
}
