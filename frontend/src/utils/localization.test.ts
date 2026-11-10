import { setLanguageChoice } from '../i18n/language';
import { getArtistBioLocalized, getArtistLocalized, getCategoryLocalized, getStageLocalized } from './localization';
import type { DbArtistBioLocalized, DbArtistLocalized } from '../types/backend';

// ── Picking the API's localized entries ───────────────────────────────────────
//
// Dimensions: the app language (English, Czech), which languages the entry has
// (both, Czech listed first as the API sends them, only one, none), and how the
// API writes the code (upper case).

afterEach(() => { setLanguageChoice('system'); });

const BIO_CS_FIRST: DbArtistBioLocalized[] = [
  { language: 'CS', content: '<p>Česky</p>' },
  { language: 'EN', content: '<p>English</p>' },
];

const ARTIST_CS_FIRST: DbArtistLocalized[] = [
  { language: 'CS', name: 'X', genre: 'death metal (cs)', country: 'USA (cs)' },
  { language: 'EN', name: 'X', genre: 'death metal', country: 'USA' },
];

describe('the bio', () => {
  it('is English in English, though the API lists Czech first', () => {
    expect(getArtistBioLocalized(BIO_CS_FIRST)).toBe('<p>English</p>');
  });

  it('is Czech in Czech', () => {
    setLanguageChoice('cs');
    expect(getArtistBioLocalized(BIO_CS_FIRST)).toBe('<p>Česky</p>');
  });

  it('falls back to English when the app language has none', () => {
    setLanguageChoice('cs');
    expect(getArtistBioLocalized([{ language: 'EN', content: 'only English' }, { language: 'DE', content: 'Deutsch' }])).toBe('only English');
  });

  it('falls back to the first entry when neither the app language nor English is there', () => {
    expect(getArtistBioLocalized([{ language: 'DE', content: 'Deutsch' }])).toBe('Deutsch');
  });

  it('is empty when there is no entry', () => {
    expect(getArtistBioLocalized([])).toBe('');
  });
});

describe('the other localized fields', () => {
  it('follow the app language: artist genre and country, stage name, category title', () => {
    setLanguageChoice('cs');
    expect(getArtistLocalized(ARTIST_CS_FIRST, 'genre')).toBe('death metal (cs)');
    expect(getArtistLocalized(ARTIST_CS_FIRST, 'country')).toBe('USA (cs)');
    expect(getStageLocalized([{ language: 'EN', name: 'Octagon' }, { language: 'CS', name: 'Osmiúhelník' }], 'name')).toBe('Osmiúhelník');
    expect(getCategoryLocalized([{ language: 'EN', title: 'Main' }, { language: 'CS', title: 'Hlavní' }], 'title')).toBe('Hlavní');
  });

  it('are English in English', () => {
    expect(getArtistLocalized(ARTIST_CS_FIRST, 'genre')).toBe('death metal');
    expect(getStageLocalized([{ language: 'CS', name: 'Osmiúhelník' }, { language: 'EN', name: 'Octagon' }], 'name')).toBe('Octagon');
  });
});
