import type { DbArtist, DbCategory, DbEvent } from '../../../types/backend';

// ── The order of a timeline's lanes ───────────────────────────────────────────
//
// Each timeline screen keeps its own order of lanes (store/uiStatePersistence,
// `laneOrder`, by screen), changed in the order panel (LaneOrderPanel). The day
// (TimelineDay.model) and the panel both order the categories by this one rule,
// so the panel lists the lanes exactly as the timeline stacks them.

const byId = (a: { categoryId: string }, b: { categoryId: string }): number =>
  parseInt(a.categoryId, 10) - parseInt(b.categoryId, 10);

/**
 * The categories in the saved order, top first. A category the order does not
 * name (none saved yet, or one new in the data) follows the named ones, by id
 * as a number; a saved id the data no longer has is skipped.
 */
export function orderLanes<T extends { categoryId: string }>(categories: readonly T[], order: readonly string[]): T[] {
  const place = new Map(order.map((id, i) => [id, i]));
  return [...categories].sort((a, b) => {
    const pa = place.get(a.categoryId);
    const pb = place.get(b.categoryId);
    if (pa !== undefined && pb !== undefined) {
      return pa - pb;
    }
    if (pa !== undefined) {
      return -1;
    }
    if (pb !== undefined) {
      return 1;
    }
    return byId(a, b);
  });
}

/**
 * A screen's categories: those holding one of its sets (`filterArtist`) on any
 * day of the festival, by id. What its order panel lists.
 */
export function screenCategories({ categories, events, artists, filterArtist }: {
  categories: readonly DbCategory[];
  events: readonly DbEvent[];
  artists: readonly DbArtist[];
  filterArtist: (artist: DbArtist) => boolean;
}): DbCategory[] {
  const artistById = new Map(artists.map((a) => [a.artistId, a]));
  const used = new Set<string>();
  for (const event of events) {
    const artist = artistById.get(event.artistId);
    if (artist !== undefined && filterArtist(artist)) {
      used.add(event.categoryId);
    }
  }
  return categories.filter((c) => used.has(c.categoryId)).sort(byId);
}
