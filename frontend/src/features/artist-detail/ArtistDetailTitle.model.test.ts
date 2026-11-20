import { artistDetailTitleModel, type ArtistDetailTitleInputs } from './ArtistDetailTitle.model';
import type { DbArtist } from '../../types/backend';

// ── The artist sheet's title row, as a model ──────────────────────────────────
//
// Dimensions: a name short or long for the room; the ⚠ shown or not; the ✕
// (web) or not; genre and country known or not. The title's room is the
// content width less the padding, its own 8 px margin and the controls drawn:
// the star 32, the ⚠ 24 + 4, the ✕ 30. A name shrinks to 80% when its words,
// wrapped at their boundaries, are estimated not to fit 3 lines at 24
// (characters × 24 × the platform's ratio); it keeps to one line when a word
// does not fit even shrunk.

function artist(name: string, localized: DbArtist['localized'] = []): DbArtist {
  return { slug: 't', artistId: 'a1', name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized };
}

function title(overrides: Partial<ArtistDetailTitleInputs> = {}) {
  return artistDetailTitleModel({ artist: artist('GOJIRA'), status: 'none', hasConflict: false, innerWidth: 400, padding: 16, isWeb: false, ...overrides });
}

// A name long enough to fit 268 px but not 240 or 238 (see the tests below).
// The glyph width is empirical and differs per platform (ui/charWidthRatio);
// fixed here at 0.75, so a character is 18 px at the title's 24 and 14.4 px at
// 19.2. LONG is three 14-letter words, one a line: 14 × 18 = 252 px at 24
// (336 without the ratio), 201.6 at 19.2. HUGE, one 41-letter word, fits no
// line even at 19.2: 41 × 14.4 = 590.4.
jest.mock('../../ui/charWidthRatio', () => ({ CHAR_WIDTH_RATIO: 0.75 }));

const WORD = 'A'.repeat(14);
const LONG = `${WORD} ${WORD} ${WORD}`;
const HUGE = 'A'.repeat(41);

describe('artistDetailTitleModel', () => {
  it('keeps a name that fits at 24', () => {
    expect(title().fontSize).toBe(24);
  });

  it('shrinks a name only once the ⚠ takes its room', () => {
    // At 340 wide the room is 340 − 32 − 8 − 32 = 268 without the ⚠ and 240
    // with it: LONG fits only without.
    expect(title({ artist: artist(LONG), innerWidth: 340 }).fontSize).toBe(24);
    expect(title({ artist: artist(LONG), innerWidth: 340, hasConflict: true }).fontSize).toBeCloseTo(19.2);
  });

  it('wraps a name over 3 lines, or keeps it to one when a word does not fit even shrunk', () => {
    expect(title({ artist: artist(LONG), innerWidth: 340 }).lines).toBe(3);
    const huge = title({ artist: artist(HUGE), innerWidth: 340 });
    expect(huge.fontSize).toBeCloseTo(19.2);
    expect(huge.lines).toBe(1);
  });

  it('gives the ✕ its room on web', () => {
    // 340 wide on web: 268 − 30 = 238.
    expect(title({ artist: artist(LONG), innerWidth: 340, isWeb: true }).fontSize).toBeCloseTo(19.2);
  });

  it('shows the ⚠ and the ✕ only when asked', () => {
    expect([title().showConflict, title().showClose]).toEqual([false, false]);
    expect([title({ hasConflict: true, isWeb: true }).showConflict, title({ hasConflict: true, isWeb: true }).showClose]).toEqual([true, true]);
  });

  it('joins genre and country, leaving out what is not known', () => {
    expect(title({ artist: artist('GOJIRA', [{ language: 'en', genre: 'THRASH METAL', country: 'Czech Republic' }] as DbArtist['localized']) }).meta)
      .toBe('THRASH METAL  ·  Czech Republic');
    expect(title({ artist: artist('GOJIRA', [{ language: 'en', genre: '', country: 'France' }] as DbArtist['localized']) }).meta).toBe('France');
    expect(title().meta).toBe('');
  });
});
