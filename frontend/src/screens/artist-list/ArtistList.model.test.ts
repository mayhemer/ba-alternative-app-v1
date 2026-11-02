import { artistListModel, sortedArtistList, withLens, type ArtistListInputs } from './ArtistList.model';
import type { DbArtist } from '../../types/backend';

// ── The artist list, configured ───────────────────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
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
  return artistListModel({ artists: ARTISTS, scope: { kind: 'all' }, interests: MINE, friendInterests: undefined, ...overrides });
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

// ── In two steps: sorted once, then the lens ──────────────────────────────────
//
// A pick changes only the lens step's input, so the screen keeps the sorted
// list and never sorts again for a pick.

describe('the two steps', () => {
  const LENS_ALL = { scope: { kind: 'all' as const }, interests: MINE, friendInterests: undefined };
  const LENS_ME = { scope: { kind: 'me' as const, level: null }, interests: MINE, friendInterests: undefined };

  it('with Everything, hands back the sorted list itself', () => {
    const sorted = sortedArtistList({ artists: ARTISTS });
    expect(withLens(sorted, LENS_ALL)).toBe(sorted);
  });

  it('narrows the sections it is given in their own order, dropping a letter it empties', () => {
    // Deliberately not in sorted order: the lens must keep it, not sort again.
    const given = {
      loading: false,
      sections: [
        { title: 'G', data: [ARTISTS[0], ARTISTS[3]] },  // Gojira (will_go), GHOST (dont_go)
        { title: 'A', data: [ARTISTS[6], ARTISTS[5]] },  // Abbath, AC/DC — no picks
        { title: 'B', data: [ARTISTS[2]] },              // Blood Incantation (maybe)
      ],
    };
    expect(shown(withLens(given, LENS_ME))).toEqual(['G: Gojira', 'B: Blood Incantation']);
  });

  it('keeps waiting while nothing is cached, whatever the lens', () => {
    expect(withLens(sortedArtistList({ artists: [] }), LENS_ME)).toEqual({ loading: true, sections: [] });
  });
});

describe('what is never listed', () => {
  it('leaves the support programme out', () => {
    expect(list().sections.flatMap((s) => s.data.map((a) => a.artistId))).not.toContain('pit');
  });

  it('waits while nothing is cached', () => {
    expect(list({ artists: [] })).toEqual({ loading: true, sections: [] });
  });

  it('waits while only support artists are cached: there is no lineup yet', () => {
    expect(list({ artists: [artist('pit', 'Pit of Doom', false)] }).loading).toBe(true);
  });
});
