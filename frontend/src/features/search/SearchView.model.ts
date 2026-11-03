import { placeResult, type Placement, type SearchScope } from './searchScope';
import { searchStrings } from './searchStrings';
import { SEARCH_ROW } from './SearchResultRow.model';
import type { SearchHit } from '../../lib/search';

// ── The results list: what it lists ───────────────────────────────────────────
//
// The hits, placed by the screen's scope, under their section headers: the
// screen's own section first, then "In the Program", then "In the Support
// program". At most MAX_ROWS rows, cut in that order, and a line counting the
// rest. Every item has a fixed height, so the list lays out without measuring.
// Null (the empty query) is no list at all: the screen behind stays dimmed.

export const SEARCH_LIST = {
  maxRows: 30,
  headerHeight: 34,
  rowHeight: SEARCH_ROW.height,
  rowGap: 12,
  moreHeight: 52,
  noneHeight: 72,
} as const;

export type SearchListItem =
  | { kind: 'header'; key: string; title: string; note: string; height: number }
  | { kind: 'row'; key: string; hit: SearchHit; placement: Placement; tag: string | null; height: number }
  | { kind: 'more'; key: 'more'; count: number; text: string; height: number }
  | { kind: 'none'; key: 'none'; text: string; height: number };

type Section = Placement['section'];
const SECTIONS: Section[] = ['here', 'program', 'support'];

function header(section: Section, scope: SearchScope): { title: string; note: string } {
  if (section === 'here') {
    return { title: scope.title, note: scope.hereOpens === 'details' ? searchStrings.opensDetails : '' };
  }
  const note = scope.elsewhereOpens === 'switch' ? searchStrings.opensThere : searchStrings.opensDetails;
  return { title: section === 'program' ? searchStrings.inProgram : searchStrings.inSupportProgram, note };
}

function hitKey(hit: SearchHit): string {
  return hit.event !== null ? hit.event.eventId : `artist-${hit.artist.artistId}`;
}

export function searchListItems(hits: SearchHit[] | null, scope: SearchScope, query = ''): SearchListItem[] | null {
  if (hits === null) {
    return null;
  }
  if (hits.length === 0) {
    return [{ kind: 'none', key: 'none', text: searchStrings.nothingFound(query.trim()), height: SEARCH_LIST.noneHeight }];
  }
  const placed = hits.map((hit) => ({ hit, placement: placeResult(scope, { artist: hit.artist, event: hit.event }) }));
  const items: SearchListItem[] = [];
  let budget: number = SEARCH_LIST.maxRows;
  for (const section of SECTIONS) {
    const rows = placed.filter((p) => p.placement.section === section);
    const shown = rows.slice(0, Math.max(0, budget));
    budget -= shown.length;
    if (shown.length === 0) {
      continue;
    }
    items.push({ kind: 'header', key: `header-${section}`, ...header(section, scope), height: SEARCH_LIST.headerHeight });
    for (const { hit, placement } of shown) {
      const tag = placement.section === 'here' ? scope.views[placement.view].tag : null;
      items.push({ kind: 'row', key: hitKey(hit), hit, placement, tag, height: SEARCH_LIST.rowHeight + SEARCH_LIST.rowGap });
    }
  }
  const rest = hits.length - SEARCH_LIST.maxRows;
  if (rest > 0) {
    items.push({ kind: 'more', key: 'more', count: rest, text: searchStrings.more(rest), height: SEARCH_LIST.moreHeight });
  }
  return items;
}

/** Each item's top, for getItemLayout. */
export function searchItemOffsets(items: SearchListItem[]): number[] {
  const offsets: number[] = [];
  let y = 0;
  for (const item of items) {
    offsets.push(y);
    y += item.height;
  }
  return offsets;
}
