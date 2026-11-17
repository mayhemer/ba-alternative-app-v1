import { orderLanes, screenCategories } from './laneOrder';
import type { DbArtist, DbCategory, DbEvent } from '../../../types/backend';

// ── The order of a timeline's lanes ───────────────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
//   saved order — none (ids as numbers: 9 before 10); a full one; one that
//                 misses a category (a new one: after the saved ones, by id);
//                 one naming a category the data no longer has (ignored)
//   screen      — bands (Program) or the rest (Support Program): a category is
//                 the screen's when it holds one of its sets on any day; one
//                 holding only the other screen's sets, or nothing, is not

function category(categoryId: string): DbCategory {
  return { slug: 't', categoryId, color: 0, localized: [] } as unknown as DbCategory;
}
function artist(artistId: string, isPlayable: boolean): DbArtist {
  return { slug: 't', artistId, name: artistId, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function event(artistId: string, categoryId: string, day: number): DbEvent {
  const from = Date.parse('2025-08-06T14:00:00+02:00') + day * 24 * 60 * 60 * 1000;
  return { slug: 't', eventId: `e-${artistId}-${day}`, artistId, stageId: 's', categoryId, dateFrom: from, dateTo: from + 60 * 60 * 1000 };
}

const ids = (list: readonly DbCategory[]): string[] => list.map((c) => c.categoryId);

describe('orderLanes', () => {
  const CATEGORIES = [category('10'), category('3'), category('9'), category('1')];

  it('orders by id as numbers when nothing is saved', () => {
    expect(ids(orderLanes(CATEGORIES, []))).toEqual(['1', '3', '9', '10']);
  });

  it('follows a saved order', () => {
    expect(ids(orderLanes(CATEGORIES, ['9', '1', '10', '3']))).toEqual(['9', '1', '10', '3']);
  });

  it('puts a category the saved order misses after the saved ones, by id', () => {
    expect(ids(orderLanes(CATEGORIES, ['10', '1']))).toEqual(['10', '1', '3', '9']);
  });

  it('ignores a saved category the data no longer has', () => {
    expect(ids(orderLanes(CATEGORIES, ['7', '9', '3', '1', '10']))).toEqual(['9', '3', '1', '10']);
  });
});

describe('screenCategories', () => {
  // Bands in 1 (Wednesday) and 2 (Friday only); support sets in 5; a band and a
  // support set share 3; nothing in 4.
  const CATEGORIES = [category('5'), category('4'), category('3'), category('2'), category('1')];
  const ARTISTS = [artist('band1', true), artist('band2', true), artist('band3', true), artist('ex5', false), artist('ex3', false)];
  const EVENTS = [
    event('band1', '1', 0),
    event('band2', '2', 2),
    event('band3', '3', 1),
    event('ex3', '3', 0),
    event('ex5', '5', 0),
  ];
  const playable = (a: DbArtist): boolean => a.isPlayable;
  const support = (a: DbArtist): boolean => !a.isPlayable;

  it('lists the Program categories holding a band on any day, by id', () => {
    expect(ids(screenCategories({ categories: CATEGORIES, events: EVENTS, artists: ARTISTS, filterArtist: playable }))).toEqual(['1', '2', '3']);
  });

  it('lists the Support Program categories holding a support set, by id', () => {
    expect(ids(screenCategories({ categories: CATEGORIES, events: EVENTS, artists: ARTISTS, filterArtist: support }))).toEqual(['3', '5']);
  });
});
