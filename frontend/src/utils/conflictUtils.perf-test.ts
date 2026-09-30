import { measureFunction } from 'reassure';
import { MEASURE_OPTIONS } from '../../tests/setup/perfOptions';
import { computeConflictEntries, computeConflictOverlaps, type ConflictInputs } from './conflictUtils';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Conflict pairing ──────────────────────────────────────────────────────────
//
// The dominant cost in the app: an O(n²) pass over starred events, run by two
// independent memos plus one per mounted timeline screen — so a single star
// press pays for it several times over.
//
// Measured over the real catalogue (260 artists, 311 events) at a plausible
// heavy plan, because the quadratic term only shows up at realistic sizes.

const ARTISTS = artistsFixture as unknown as DbArtist[];
const STAGES = stagesFixture as unknown as DbStage[];
const EVENTS = scheduleFixture as unknown as DbEvent[];

const ARTIST_EVENTS: Record<string, DbEvent[]> = {};
for (const e of EVENTS) {
  (ARTIST_EVENTS[e.artistId] ??= []).push(e);
}

const INPUTS: ConflictInputs = { artists: ARTISTS, stages: STAGES, artistEvents: ARTIST_EVENTS };

// Artists that actually have a slot — starring one without events costs nothing
// and would flatter the measurement.
const PLAYABLE = ARTISTS.filter((a) => ARTIST_EVENTS[a.artistId]?.length);

function starred(count: number): Record<string, string> {
  return Object.fromEntries(PLAYABLE.slice(0, count).map((a) => [a.artistId, 'must_see']));
}

// A full festival plan: roughly what someone who has been through the whole
// lineup ends up with.
const HEAVY = starred(40);

test('computeConflictEntries over a full plan', async () => {
  await measureFunction(() => computeConflictEntries(HEAVY, INPUTS), MEASURE_OPTIONS);
});

test('computeConflictOverlaps over a full plan', async () => {
  // Runs the whole pairing again, then merges intervals per entry. This is what
  // the timeline recomputes on every star press.
  await measureFunction(() => computeConflictOverlaps(HEAVY, INPUTS), MEASURE_OPTIONS);
});

test('computeConflictEntries with nothing starred', async () => {
  // The common case, and the floor the others are read against: it still walks
  // every artist to collect the marked set.
  await measureFunction(() => computeConflictEntries({}, INPUTS), MEASURE_OPTIONS);
});
