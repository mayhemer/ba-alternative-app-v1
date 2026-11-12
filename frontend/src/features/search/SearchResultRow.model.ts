import type { InterestStatus } from '../../cache/cacheService';
import type { SearchHit } from '../../lib/search';
import type { DbStage } from '../../types/backend';
import { formatTime, formatWeekday, getFestivalDayStart } from '../../utils/festivalTime';
import { getStageLocalized } from '../../utils/localization';
import { artistGenreCountry, GENRE_COUNTRY_SEPARATOR } from '../artist-detail/ArtistDetailTitle.model';

// ── A search result row: what it shows ────────────────────────────────────────
//
// Two lines at a fixed height: the name with the matched part picked out, then
// the festival day, the time and the stage. An artist with no set shows its
// genre and country there instead, the line its artist sheet shows under the
// name (artistGenreCountry); knowing neither, the line stays empty, at the same
// height. No fill of its own (the list shows through), no frame, no rounding and
// no colour bar: nothing in a row follows the set's category.

export const SEARCH_ROW = {
  height: 58,
  /** From the row's edge to the text. */
  textInset: 14,
  nameSize: 15,
  metaSize: 13,
  starSize: 16,
} as const;

export type SearchResultRowInputs = {
  hit: SearchHit;
  /** My pick, for the star. */
  status: InterestStatus;
  stage: DbStage | undefined;
  /** What landing on it widens, as the screen names it; null for none. */
  tag: string | null;
};

export type SearchResultRowModel = {
  key: string;
  nameBefore: string;
  nameMatch: string;
  nameAfter: string;
  /** "Fri · 19:00–20:00 · Marshall"; with no set, "THRASH METAL  ·  France"; null when nothing is known. */
  meta: string | null;
  status: InterestStatus;
  tag: string | null;
  accessibilityLabel: string;
  height: number;
};

export function searchResultRowModel({ hit, status, stage, tag }: SearchResultRowInputs): SearchResultRowModel {
  const { artist, event, match } = hit;
  const name = artist.name;
  let meta: string | null;
  let spoken: string[];
  if (event !== null) {
    const when = `${formatWeekday(getFestivalDayStart(event.dateFrom))} · ${formatTime(event.dateFrom)}–${formatTime(event.dateTo)}`;
    const stageName = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
    const where = stageName !== '' ? [stageName] : [];
    meta = [when, ...where].join(' · ');
    spoken = [when.replace(' · ', ' '), ...where];
  } else {
    spoken = artistGenreCountry(artist);
    meta = spoken.length > 0 ? spoken.join(GENRE_COUNTRY_SEPARATOR) : null;
  }
  return {
    key: event !== null ? event.eventId : `artist-${artist.artistId}`,
    nameBefore: name.slice(0, match.start),
    nameMatch: name.slice(match.start, match.end),
    nameAfter: name.slice(match.end),
    meta,
    status,
    tag,
    accessibilityLabel: [name, ...spoken].join(', '),
    height: SEARCH_ROW.height,
  };
}
