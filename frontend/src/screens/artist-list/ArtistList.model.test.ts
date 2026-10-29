import { artistListModel, type ArtistListInputs } from './ArtistList.model';
import type { DbArtist } from '../../types/backend';

// ── The artist list, configured ───────────────────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
//   search — blank, spaces only, a partial match in another case, no match
//   lens   — Everything; My picks (any level, Maybe and up, Must-see only);
//            a friend's picks (theirs, not mine)
//   data   — a support artist (never listed); a "don't go" (not a pick);
//            nothing cached
//   order  — "#" first, letters in order, names sorted with case and
//            punctuation ignored, a diacritic under its letter

function artist(artistId: string, name: string, isPlayable = true): DbArtist {
  return { slug: 't', artistId, name, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}

const ARTISTS = [
  artist('gojira', 'Gojira'),
  artist('3ib', '3 Inches of Blood'),
  artist('blood', 'Blood Incantation'),
  artist('ghost', 'GHOST'),
  artist('obsc', 'Öbscure'),
  artist('acdc', 'AC/DC'),
  artist('abba', 'Abbath'),
  artist('pit', 'Pit of Doom', false),
];
const MINE: Record<string, string> = { gojira: 'will_go', blood: 'maybe', ghost: 'dont_go' };

function list(overrides: Partial<ArtistListInputs> = {}) {
  return artistListModel({ artists: ARTISTS, query: '', scope: { kind: 'all' }, interests: MINE, friendInterests: undefined, ...overrides });
}

/** The list as `letter: names`. */
const shown = (m: ReturnType<typeof list>): string[] => m.sections.map((s) => `${s.title}: ${s.data.map((a) => a.name).join(', ')}`);

describe('the order', () => {
  it('puts "#" first, then the letters, each sorted by name; a diacritic under its letter', () => {
    expect(shown(list())).toEqual([
      '#: 3 Inches of Blood',
      'A: Abbath, AC/DC',
      'B: Blood Incantation',
      'G: GHOST, Gojira',
      'O: Öbscure',
    ]);
  });
});

describe('the search', () => {
  it('lists everything for a blank search, or one of spaces', () => {
    expect(shown(list({ query: '' }))).toEqual(shown(list({ query: '   ' })));
  });

  it('matches part of a name, whatever the case', () => {
    expect(shown(list({ query: 'GOJ' }))).toEqual(['G: Gojira']);
    expect(shown(list({ query: 'blood' }))).toEqual(['#: 3 Inches of Blood', 'B: Blood Incantation']);
  });

  it('lists nothing for no match — an answer, not a wait', () => {
    expect(list({ query: 'zzz' })).toEqual({ loading: false, sections: [] });
  });

  it('narrows within the lens', () => {
    expect(shown(list({ query: 'blood', scope: { kind: 'me', level: null } }))).toEqual(['B: Blood Incantation']);
  });
});

describe('the lens', () => {
  it('lists my Maybes and Must-sees with "My picks", not a "don\'t go"', () => {
    expect(shown(list({ scope: { kind: 'me', level: null } }))).toEqual(['B: Blood Incantation', 'G: Gojira']);
  });

  it('lists only my Must-sees at the Must-see level', () => {
    expect(shown(list({ scope: { kind: 'me', level: 'will_go' } }))).toEqual(['G: Gojira']);
  });

  it("lists the friend's picks, not mine", () => {
    expect(shown(list({ scope: { kind: 'friend', token: 'f', level: null }, friendInterests: { abba: 'maybe' } }))).toEqual(['A: Abbath']);
  });
});

describe('what is never listed', () => {
  it('leaves the support programme out', () => {
    expect(shown(list({ query: 'pit' }))).toEqual([]);
  });

  it('waits while nothing is cached', () => {
    expect(list({ artists: [] })).toEqual({ loading: true, sections: [] });
  });

  it('waits while only support artists are cached: there is no lineup yet', () => {
    expect(list({ artists: [artist('pit', 'Pit of Doom', false)] }).loading).toBe(true);
  });
});
