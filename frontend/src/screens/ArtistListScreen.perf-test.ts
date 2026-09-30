import { measureFunction } from 'reassure';
import { BATCH, MEASURE_OPTIONS, repeat } from '../../tests/setup/perfOptions';
import { buildSections } from './ArtistListScreen';
import type { DbArtist } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';

// ── Artist list grouping ──────────────────────────────────────────────────────
//
// buildSections groups by first letter and sorts each group with
// localeCompare(..., { sensitivity: 'base', ignorePunctuation: true }). The memo
// that calls it depends on the search query, so this runs on every keystroke.
//
// Worth gating specifically because it is the app's one Intl-dependent hot path,
// and Intl is where Hermes and V8 diverge most: a regression here would be
// invisible on web and painful on a cheap Android. Node numbers cannot show that
// divergence — they only catch the algorithm getting worse.

const ARTISTS = (artistsFixture as unknown as DbArtist[]).filter((a) => a.isPlayable);

test(`buildSections over the full lineup (x${BATCH.buildSectionsFull})`, async () => {
  await measureFunction(repeat(() => buildSections(ARTISTS), BATCH.buildSectionsFull), MEASURE_OPTIONS);
});

test(`buildSections over a typical search result (x${BATCH.buildSectionsNarrowed})`, async () => {
  // What a few keystrokes narrow to — the grouping and collation still run in full.
  const narrowed = ARTISTS.filter((a) => a.name.toLowerCase().includes('a'));
  await measureFunction(
    repeat(() => buildSections(narrowed), BATCH.buildSectionsNarrowed),
    MEASURE_OPTIONS,
  );
});
