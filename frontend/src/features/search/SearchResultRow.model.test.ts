import { searchResultRowModel, SEARCH_ROW } from './SearchResultRow.model';
import { categoryBlockColors, decodeCategoryColor } from '../../utils/color';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

// ── A search result row: what it shows ───────────────────────────────────────
//
// Dimensions: a set vs an artist with no set; a set after midnight (it belongs
// to the festival day before); a stage the cache knows or not; a category or
// none; where the match sits in the name; a widening tag or none; for an artist
// with no set, genre and country known, one of them, or neither.

const SLUG = 'searchrowtest';
const at = (iso: string): number => Date.parse(`${iso}+02:00`);

const gojira: DbArtist = { slug: SLUG, artistId: 'gojira', name: 'GOJIRA', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
const darkFuneral: DbArtist = { ...gojira, artistId: 'df', name: 'DARK FUNERAL' };
const stage: DbStage = { slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'EN', name: 'Sea Shepherd' }] };
const category: DbCategory = { slug: SLUG, categoryId: 'c1', color: -2221743, localized: [] };

function set(artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId: `${artistId}-1`, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

const base = {
  hit: { artist: gojira, event: set('gojira', '2025-08-07T21:50:00', '2025-08-07T23:10:00'), match: { rank: 0 as const, start: 1, end: 3 } },
  status: 'will_go' as const,
  stage,
  category,
  tag: null,
};

describe('searchResultRowModel', () => {
  it('splits the name around the match', () => {
    const row = searchResultRowModel(base);
    expect([row.nameBefore, row.nameMatch, row.nameAfter]).toEqual(['G', 'OJ', 'IRA']);
  });

  it('says the festival day, the time and the stage on the second line', () => {
    expect(searchResultRowModel(base).meta).toBe('Thu · 21:50–23:10 · Sea Shepherd');
  });

  it('names the festival day a set after midnight belongs to', () => {
    const late = { ...base, hit: { ...base.hit, artist: darkFuneral, event: set('df', '2025-08-10T00:35:00', '2025-08-10T01:30:00') } };
    expect(searchResultRowModel(late).meta).toBe('Sat · 00:35–01:30 · Sea Shepherd');
  });

  it('leaves out a stage the cache does not know', () => {
    expect(searchResultRowModel({ ...base, stage: undefined }).meta).toBe('Thu · 21:50–23:10');
  });

  it('colours the bar like the set\'s timeline block edge, and draws none without a category', () => {
    expect(searchResultRowModel(base).barColor).toBe(categoryBlockColors(decodeCategoryColor(-2221743)).border);
    expect(searchResultRowModel({ ...base, category: undefined }).barColor).toBeNull();
  });

  // An artist with no set, as the cache has it before the schedule.
  const unscheduled = (localized: DbArtist['localized']): Parameters<typeof searchResultRowModel>[0] => ({
    ...base,
    hit: { artist: { ...gojira, localized }, event: null, match: { rank: 0, start: 0, end: 2 } },
    stage: undefined,
    category: undefined,
  });
  const bothKnown = [{ language: 'en', genre: 'PROGRESSIVE DEATH METAL', country: 'France' }] as DbArtist['localized'];

  it('shows an artist with no set by name, then genre and country as the artist sheet does, at the same height', () => {
    const row = searchResultRowModel(unscheduled(bothKnown));
    expect([row.key, row.meta, row.barColor, row.height]).toEqual(['artist-gojira', 'PROGRESSIVE DEATH METAL  ·  France', null, SEARCH_ROW.height]);
  });

  it('leaves out what is not known of genre and country, and the second line empty when neither is', () => {
    expect(searchResultRowModel(unscheduled([{ language: 'en', genre: '', country: 'France' }] as DbArtist['localized'])).meta).toBe('France');
    expect(searchResultRowModel(unscheduled([])).meta).toBeNull();
  });

  it('reads out an artist with no set by name, genre and country', () => {
    expect(searchResultRowModel(unscheduled(bothKnown)).accessibilityLabel).toBe('GOJIRA, PROGRESSIVE DEATH METAL, France');
  });

  it('keys a set by its eventId', () => {
    expect(searchResultRowModel(base).key).toBe('gojira-1');
  });

  it('carries my pick for the star', () => {
    expect(searchResultRowModel({ ...base, status: 'dont_go' }).status).toBe('dont_go');
  });

  it('shows the widening the screen names for it, or none', () => {
    expect(searchResultRowModel(base).tag).toBeNull();
    expect(searchResultRowModel({ ...base, tag: 'Filter → All sets' }).tag).toBe('Filter → All sets');
  });

  it('reads out the name, the time and the stage', () => {
    expect(searchResultRowModel(base).accessibilityLabel).toBe('GOJIRA, Thu 21:50–23:10, Sea Shepherd');
  });
});
