import { artistDetailTitleModel, type ArtistDetailTitleInputs } from './ArtistDetailTitle.model';
import type { DbArtist } from '../../types/backend';

// ── The artist sheet's title row, as a model ──────────────────────────────────
//
// Dimensions: a name short or long for the room; the ⚠ shown or not; the ✕
// (web) or not; genre and country known or not. The title's room is the
// content width less the padding, its own 8 px margin and the controls drawn:
// the star 32, the ⚠ 24 + 4, the ✕ 30. A name shrinks to 80% when its estimate
// (characters × 24 × 0.55, over 3 lines) does not fit.

function artist(name: string, localized: DbArtist['localized'] = []): DbArtist {
  return { slug: 't', artistId: 'a1', name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized };
}

function title(overrides: Partial<ArtistDetailTitleInputs> = {}) {
  return artistDetailTitleModel({ artist: artist('GOJIRA'), status: 'none', hasConflict: false, innerWidth: 400, padding: 16, isWeb: false, ...overrides });
}

// 57 characters: 57 × 13.2 / 3 = 250.8 px of estimated width.
const LONG = 'A'.repeat(57);

describe('artistDetailTitleModel', () => {
  it('keeps a name that fits at 24', () => {
    expect(title().fontSize).toBe(24);
  });

  it('shrinks a name only once the ⚠ takes its room', () => {
    // At 340 wide the room is 340 − 32 − 8 − 32 = 268 without the ⚠ and 240
    // with it: 250.8 fits only without.
    expect(title({ artist: artist(LONG), innerWidth: 340 }).fontSize).toBe(24);
    expect(title({ artist: artist(LONG), innerWidth: 340, hasConflict: true }).fontSize).toBeCloseTo(19.2);
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
