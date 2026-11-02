import { placeResult, type SearchScope, type SetRef } from './searchScope';
import { SEARCH_LIST, searchListItems, type SearchListItem } from './SearchView.model';
import type { SearchHit } from '../../lib/search';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── Where a result goes, and the list the results make ───────────────────────
//
// Dimensions: a set the screen contains or not; the first of the screen's views
// that shows it (its own, or a wider one); a band vs a support artist; an artist
// with no set; how a screen opens results (land / details, switch / details);
// how many results there are against the 30-row cap, in which sections.

const SLUG = 'searchscopetest';

function artist(artistId: string, isPlayable: boolean): DbArtist {
  return { slug: SLUG, artistId, name: artistId.toUpperCase(), isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: 0, dateTo: 1 };
}

const band = artist('band', true);
const support = artist('support', false);

/** A Program-like scope: contains bands; its own view hides `hidden`, the wider one shows all. */
function programScope(hidden: Set<string> = new Set()): SearchScope {
  return {
    title: 'Program',
    hereOpens: 'land',
    elsewhereOpens: 'switch',
    contains: (ref: SetRef) => ref.artist.isPlayable,
    views: [
      { shows: (ref: SetRef) => ref.event === null || !hidden.has(ref.event.eventId), tag: null },
      { shows: () => true, tag: 'Lens → Everything' },
    ],
    reveal: jest.fn(),
    openElsewhere: jest.fn(),
  };
}

describe('placeResult', () => {
  it('places a set the screen contains in its own section, at the first view that shows it', () => {
    expect(placeResult(programScope(), { artist: band, event: set('b1', 'band') })).toEqual({ section: 'here', view: 0 });
    expect(placeResult(programScope(new Set(['b1'])), { artist: band, event: set('b1', 'band') })).toEqual({ section: 'here', view: 1 });
  });

  it('places a set the screen does not contain by where it is: the Program or the Support program', () => {
    const supportScope: SearchScope = { ...programScope(), contains: (ref) => !ref.artist.isPlayable };
    expect(placeResult(programScope(), { artist: support, event: set('s1', 'support') })).toEqual({ section: 'support' });
    expect(placeResult(supportScope, { artist: band, event: set('b1', 'band') })).toEqual({ section: 'program' });
  });

  it('places a contained set no view shows where it is', () => {
    const scope: SearchScope = { ...programScope(), views: [{ shows: () => false, tag: null }] };
    expect(placeResult(scope, { artist: band, event: set('b1', 'band') })).toEqual({ section: 'program' });
  });

  it('places an artist with no set by the same rules', () => {
    expect(placeResult(programScope(), { artist: band, event: null })).toEqual({ section: 'here', view: 0 });
    expect(placeResult(programScope(), { artist: support, event: null })).toEqual({ section: 'support' });
  });
});

describe('searchListItems', () => {
  const hit = (a: DbArtist, eventId: string | null): SearchHit => ({
    artist: a,
    event: eventId === null ? null : set(eventId, a.artistId),
    match: { rank: 0, start: 0, end: 1 },
  });
  const shape = (items: SearchListItem[] | null): string[] | null => items?.map((item) => {
    switch (item.kind) {
      case 'header': return `# ${item.title} | ${item.note}`;
      case 'row': return item.hit.event?.eventId ?? `${item.hit.artist.artistId} (no set)`;
      case 'more': return `+${item.count}`;
      case 'none': return 'none';
      default: return 'unknown';
    }
  }) ?? null;

  it('is nothing at all for an empty query: the screen stays dimmed', () => {
    expect(searchListItems(null, programScope())).toBeNull();
  });

  it('says so when nothing matches', () => {
    expect(shape(searchListItems([], programScope()))).toEqual(['none']);
  });

  it('lists this screen\'s section first, then the Program, then the Support program, each under its header', () => {
    const scope: SearchScope = { ...programScope(), title: 'My plan', hereOpens: 'land', elsewhereOpens: 'details', contains: (ref) => ref.event?.eventId === 'mine' };
    const hits = [hit(support, 's1'), hit(band, 'b1'), hit(band, 'mine')];
    expect(shape(searchListItems(hits, scope))).toEqual([
      '# My plan | ',
      'mine',
      '# In the Program | opens details',
      'b1',
      '# In the Support Program | opens details',
      's1',
    ]);
  });

  it('notes that a tap on the other timeline opens it there', () => {
    expect(shape(searchListItems([hit(band, 'b1'), hit(support, 's1')], programScope()))).toEqual([
      '# Program | ',
      'b1',
      '# In the Support Program | opens there',
      's1',
    ]);
  });

  it('notes that every tap opens details where this screen does (Artists)', () => {
    const scope: SearchScope = { ...programScope(), title: 'Bands', hereOpens: 'details', elsewhereOpens: 'details' };
    expect(shape(searchListItems([hit(band, null), hit(support, null)], scope))).toEqual([
      '# Bands | opens details',
      'band (no set)',
      '# In the Support Program | opens details',
      'support (no set)',
    ]);
  });

  it('keeps the order of the hits within a section', () => {
    expect(shape(searchListItems([hit(band, 'b2'), hit(band, 'b1')], programScope()))).toEqual(['# Program | ', 'b2', 'b1']);
  });

  it('cuts at 30 rows in display order, this screen\'s own kept first, and counts the rest', () => {
    const elsewhere = Array.from({ length: 10 }, (_, i) => hit(support, `s${i}`));
    const here = Array.from({ length: 25 }, (_, i) => hit(band, `b${i}`));
    const items = shape(searchListItems([...elsewhere, ...here], programScope()));
    expect(items).toEqual([
      '# Program | ',
      ...here.map((h) => h.event?.eventId),
      '# In the Support Program | opens there',
      's0', 's1', 's2', 's3', 's4',
      '+5',
    ]);
  });

  it('drops a section the cut leaves empty, header and all', () => {
    const here = Array.from({ length: 32 }, (_, i) => hit(band, `b${i}`));
    const items = shape(searchListItems([...here, hit(support, 's0')], programScope()));
    expect(items?.filter((line) => line?.startsWith('#'))).toEqual(['# Program | ']);
    expect(items?.at(-1)).toBe('+3');
  });

  it('gives every item its fixed height, so the list lays out without measuring', () => {
    const items = searchListItems([hit(band, 'b1')], programScope()) ?? [];
    expect(items.map((item) => item.height)).toEqual([SEARCH_LIST.headerHeight, SEARCH_LIST.rowHeight + SEARCH_LIST.rowGap]);
  });
});
