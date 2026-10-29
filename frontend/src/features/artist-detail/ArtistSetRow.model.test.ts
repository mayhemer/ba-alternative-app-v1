import { artistSetRowModel, type ArtistSetRowInputs } from './ArtistSetRow.model';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';
import type { ConflictEntry } from '../conflicts/conflictUtils';
import { colors } from '../../styling/tokens';

// ── One of the artist's sets in the sheet, as a model ─────────────────────────
//
// Dimensions: a set in the evening or after midnight (the calendar date, but
// the festival day the timeline draws it on); a band or the support programme
// (which timeline a tap goes to); clashing or not; stage and category known
// or not.

const at = (iso: string): number => Date.parse(iso);
const event: DbEvent = { slug: 't', eventId: 'e1', artistId: 'a1', stageId: 's1', categoryId: 'c1',
  dateFrom: at('2025-08-07T00:35:00+02:00'), dateTo: at('2025-08-07T01:30:00+02:00') };
const band: DbArtist = { slug: 't', artistId: 'a1', name: 'ROTTING CHRIST', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
const stage = { slug: 't', stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Obscure' }] } as unknown as DbStage;
const category = { slug: 't', categoryId: 'c1', color: 0xffff0000, localized: [] } as unknown as DbCategory;

function row(overrides: Partial<ArtistSetRowInputs> = {}) {
  return artistSetRowModel({ event, artist: band, stage, category, conflict: undefined, padding: 16, ...overrides });
}

describe('artistSetRowModel', () => {
  it('dates a set after midnight by the calendar: Wednesday night 00:35 is "Thu 7"', () => {
    expect([row().day, row().time]).toEqual(['Thu 7', '00:35–01:30']);
  });

  it('goes to the festival day the timeline draws the set on: Wednesday', () => {
    expect(row().jump).toEqual({ support: false, day: at('2025-08-06T06:00:00+02:00') });
  });

  it('goes to the Support Program for a support artist', () => {
    expect(row({ artist: { ...band, isPlayable: false } }).jump.support).toBe(true);
  });

  it('names the stage and takes the category\'s colour', () => {
    expect([row().stage, row().borderColor]).toEqual(['Obscure', 'rgb(255, 0, 0)']);
  });

  it('leaves the stage blank and the border plain when they are not known', () => {
    expect([row({ stage: undefined }).stage, row({ category: undefined }).borderColor]).toEqual(['', colors.textPrimary]);
  });

  it('says how many sets it overlaps while it clashes', () => {
    expect(row().conflict).toBeNull();
    expect(row({ conflict: { overlapCount: 2 } as ConflictEntry }).conflict).toBe('Overlaps with 2 other event(s)');
  });
});
