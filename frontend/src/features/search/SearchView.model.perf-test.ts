import { measureFunction } from 'reassure';
import { BATCH, FUNCTION_MEASURE_OPTIONS, repeat } from '../../../tests/setup/perfOptions';
import { PROGRAM_LIKE_SCOPE } from '../../../tests/setup/searchScopeStub';
import { searchIndex, searchLineup } from '../../lib/search';
import { searchListItems } from './SearchView.model';
import type { DbArtist, DbEvent } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── The search's results, keystroke by keystroke ──────────────────────────────
//
// What the open search computes for each query it shows: the matches, ordered,
// then placed into the list (searchLineup, searchListItems). The index is built
// once per lineup, outside the keystrokes. Over the 2025 lineup: "g" matches
// 110 sets and artists, cut to 30 rows, the fullest list there is; "go" 14;
// "gojira" GOJIRA's set and the exhibition's four days; "$" nothing ("Nothing
// found"). The rendering of the same queries: SearchView.renders.perf-test.tsx.

const ARTIST_EVENTS: Record<string, DbEvent[]> = {};
for (const e of scheduleFixture as unknown as DbEvent[]) {
  (ARTIST_EVENTS[e.artistId] ??= []).push(e);
}
const INDEX = searchIndex(artistsFixture as unknown as DbArtist[]);

const results = (query: string): unknown => searchListItems(searchLineup(query, INDEX, ARTIST_EVENTS), PROGRAM_LIKE_SCOPE, query);

const QUERIES = [
  { query: 'g', times: BATCH.searchOneLetter },
  { query: 'go', times: BATCH.searchLonger },
  { query: 'gojira', times: BATCH.searchLonger },
  { query: '$', times: BATCH.searchNothing },
];

for (const { query, times } of QUERIES) {
  test(`search results for "${query}" (x${times})`, async () => {
    await measureFunction(repeat(() => results(query), times), FUNCTION_MEASURE_OPTIONS);
  });
}
