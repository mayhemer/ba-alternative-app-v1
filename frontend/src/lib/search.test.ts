import { foldName, foldQuery, matchName, searchIndex, searchLineup } from './search';
import type { DbArtistEventMap } from '../cache/cacheService';
import type { DbArtist, DbEvent } from '../types/backend';

// ── Searching the lineup by name ──────────────────────────────────────────────
//
// Dimensions: case and accents, in the name and in the query, precomposed or
// not; where in the name the query matches (start, a word, anywhere) and which
// occurrence counts; a band vs a support artist; an artist with several sets,
// and one with none; a blank query.

const SLUG = 'searchtest';
const at = (iso: string): number => Date.parse(`${iso}+02:00`);

function artist(artistId: string, name: string, isPlayable = true): DbArtist {
  return { slug: SLUG, artistId, name, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

describe('foldName', () => {
  it('drops case and accents', () => {
    expect(foldName('SKÁLMÖLD').folded).toBe('skalmold');
  });

  it('folds a decomposed name to the same letters, each pointing back at its own', () => {
    // S k a ◌́ l m o ◌̈ l d
    const folded = foldName('Skálmöld');
    expect(folded.folded).toBe('skalmold');
    expect(folded.origin).toEqual([0, 1, 2, 4, 5, 6, 8, 9]);
  });
});

describe('foldQuery', () => {
  it('trims and folds, and a blank query is empty', () => {
    expect(foldQuery('  Skál ')).toBe('skal');
    expect(foldQuery('   ')).toBe('');
  });
});

describe('matchName', () => {
  it('ranks a name that starts with the query first', () => {
    expect(matchName(foldName('GOJIRA'), 'go')).toEqual({ rank: 0, start: 0, end: 2 });
  });

  it('ranks a word that starts with it next, after a space or a bracket', () => {
    expect(matchName(foldName('MARIO DUPLANTIER (GOJIRA)'), 'goj')).toEqual({ rank: 1, start: 18, end: 21 });
    expect(matchName(foldName('M&G - ASPHYX'), 'asp')).toEqual({ rank: 1, start: 6, end: 9 });
  });

  it('ranks a match inside a word last', () => {
    expect(matchName(foldName('MASTODON'), 'odo')).toEqual({ rank: 2, start: 4, end: 7 });
  });

  it('takes the best-ranked occurrence, not the first', () => {
    expect(matchName(foldName('XDARK DARK'), 'dark')).toEqual({ rank: 1, start: 6, end: 10 });
  });

  it('reports the match in the original name, accents included', () => {
    // "lmo" ends before the decomposed o's diaeresis in the folded name, but the
    // highlight must not split the letter from it.
    expect(matchName(foldName('Skálmöld'), 'lmo')).toEqual({ rank: 2, start: 4, end: 8 });
  });

  it('finds an accented name from a plain query', () => {
    expect(matchName(foldName('SKÁLMÖLD'), foldQuery('skalm'))).toEqual({ rank: 0, start: 0, end: 5 });
  });

  it('answers null for no match and for an empty query', () => {
    expect(matchName(foldName('GOJIRA'), 'xyz')).toBeNull();
    expect(matchName(foldName('GOJIRA'), '')).toBeNull();
  });
});

describe('searchLineup', () => {
  const gojira = artist('gojira', 'GOJIRA');
  const exhibition = artist('exhibition', 'MARIO DUPLANTIER (GOJIRA) - TAR BASED COCKTAIL', false);
  const meet = artist('meet', 'M&G - GOJIRA', false);
  const mastodon = artist('mastodon', 'MASTODON');
  const artists = [meet, exhibition, mastodon, gojira];
  const events: DbArtistEventMap = {
    gojira: [set('gojira-thu', 'gojira', '2025-08-07T21:50:00', '2025-08-07T23:10:00')],
    // Listed out of order: the search orders by time, not by the feed.
    exhibition: [
      set('exhibition-thu', 'exhibition', '2025-08-07T10:00:00', '2025-08-07T23:00:00'),
      set('exhibition-wed', 'exhibition', '2025-08-06T10:00:00', '2025-08-06T23:00:00'),
    ],
    mastodon: [set('mastodon-wed', 'mastodon', '2025-08-06T21:10:00', '2025-08-06T22:15:00')],
    // meet: no set
  };
  const index = searchIndex(artists);
  const found = (query: string): string[] =>
    searchLineup(query, index, events).map((hit) => hit.event?.eventId ?? `${hit.artist.artistId} (no set)`);

  it('lists one result per set, by rank, then by start, an artist with no set last', () => {
    expect(found('gojira')).toEqual(['gojira-thu', 'exhibition-wed', 'exhibition-thu', 'meet (no set)']);
  });

  it('carries the match with each result', () => {
    const [hit] = searchLineup('odo', index, events);
    expect([hit.artist.artistId, hit.match]).toEqual(['mastodon', { rank: 2, start: 4, end: 7 }]);
  });

  it('matches case- and accent-insensitively', () => {
    expect(found('GoJiRá')).toEqual(['gojira-thu', 'exhibition-wed', 'exhibition-thu', 'meet (no set)']);
  });

  it('finds nothing for a blank query', () => {
    expect(found('  ')).toEqual([]);
  });
});
