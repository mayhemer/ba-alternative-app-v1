// ── Frontend test fixtures, generated from the backend's real API captures ─────
//
// The backend already keeps real captured responses from the *official* upstream
// API in backend/tests/fixtures/{ba2024,ba2025}/. The frontend does not talk to
// that API — it talks to our own, which serves a normalized shape. So rather
// than hand-writing synthetic catalogue data, this runs the captures through the
// very same `normalize` functions production uses, and writes the result in the
// exact shape each frontend endpoint returns.
//
// Shape correctness is therefore free: if the normalizers change, regenerating
// moves the fixtures with them. Realism is free too — 265 artists and 307 events
// per edition is the volume the perf tests need.
//
// Run:   npm run gen:fixtures
// (Node's type stripping handles the cross-package TypeScript import; normalize.ts
//  has only `import type` dependencies, so nothing else needs resolving.)
//
// The output is COMMITTED, so the test run itself needs no backend and no build
// step. Regenerate only when the captures are refreshed or a normalizer changes.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractUniqueStages,
  normalizeArtist,
  normalizeCategory,
  normalizeEvent,
  normalizeStage,
} from '../../backend/lambdas/sync/normalize.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURES = join(HERE, '../../backend/tests/fixtures');
const OUT_ROOT = join(HERE, '../tests/fixtures/generated');

const EDITIONS = ['ba2024', 'ba2025'] as const;

// Pinned so every regeneration produces byte-identical output — a fixture that
// moved because the clock moved would show up as noise in every diff. The value
// is inside the ba2025 festival week, which is also what the tests pin "now" to.
const LAST_SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');
// Deliberately older than LAST_SYNCED_AT: the two move independently in
// production (a schedule-only rebuild leaves the artists alone), and the bio
// invalidation path only has something to test when they differ.
const ARTISTS_SYNCED_AT = Date.parse('2025-08-05T09:00:00+02:00');

type Capture = {
  artists: unknown[];
  schedule: { schedules: unknown[]; categories: unknown[] };
};

function readCapture(edition: string): Capture {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(join(CAPTURES, edition, `${name}.json`), 'utf8'));
  return {
    artists: read('artists') as unknown[],
    schedule: read('schedule') as Capture['schedule'],
  };
}

function write(edition: string, name: string, data: unknown): void {
  const dir = join(OUT_ROOT, edition);
  mkdirSync(dir, { recursive: true });
  // Trailing newline and 2-space indent so the committed files diff sanely.
  writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

for (const edition of EDITIONS) {
  const { artists, schedule } = readCapture(edition);

  // Full normalized artists, bios included — this is the stored shape.
  const full = artists.map((a) => normalizeArtist(edition, a as never));

  // GET /{slug}/artists serves the list shape: the same records minus `content`,
  // which is roughly three quarters of the payload.
  write(edition, 'artists', full.map((a) => ({
    ...a,
    localized: a.localized.map(({ content: _content, ...rest }) => rest),
  })));

  // GET /{slug}/bios serves the bios for the whole edition in one response.
  write(edition, 'bios', full.map((a) => ({
    artistId: a.artistId,
    localized: a.localized.map((l) => ({ language: l.language, content: l.content })),
  })));

  write(edition, 'categories',
    schedule.categories.map((c) => normalizeCategory(edition, c as never)));

  // Stages are embedded in each schedule item rather than served separately.
  write(edition, 'stages',
    extractUniqueStages(schedule.schedules as never).map((s) => normalizeStage(edition, s)));

  write(edition, 'schedule',
    schedule.schedules.map((e) => normalizeEvent(edition, e as never)));

  // GET /{slug}/validity takes no caller watermark: it reports the server's own
  // times and the client compares. See adapters/baPublicApiAdapter.validate.
  write(edition, 'validity', {
    lastSyncedAt: LAST_SYNCED_AT,
    artistsSyncedAt: ARTISTS_SYNCED_AT,
  });

  console.log(
    `${edition}: ${full.length} artists, ${schedule.categories.length} categories, ` +
    `${extractUniqueStages(schedule.schedules as never).length} stages, ` +
    `${schedule.schedules.length} events`,
  );
}

console.log(`\nWritten to ${OUT_ROOT}`);
