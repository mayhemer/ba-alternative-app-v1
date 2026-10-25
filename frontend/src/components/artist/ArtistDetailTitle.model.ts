import type { DbArtist } from '../../types/backend';
import type { InterestStatus } from '../../context/InterestContext';
import { getArtistLocalized } from '../../utils/localization';
import { fitFontSize } from '../../utils/textFit';

// ── The artist sheet's title row: what it shows ───────────────────────────────
//
// The name, sized to the room the controls beside it leave — the star, the ⚠
// only while one of the artist's sets clashes, the ✕ on web — so the title and
// the controls actually drawn come from the same inputs; then genre · country.

export const TITLE_LAYOUT = {
  fontSize: 24,
  lines: 3,
  marginRight: 8,
  /** The large star button's icon. */
  starWidth: 32,
  /** ExclamationTouchable's default size, and the gap before the star. */
  conflictWidth: 24,
  gap: 4,
  /** The ✕ glyph and its margin. */
  closeWidth: 30,
} as const;

export type ArtistDetailTitleModel = {
  /** The artistId. */
  key: string;
  name: string;
  fontSize: number;
  /** "THRASH METAL  ·  Czech Republic"; empty when neither is known. */
  meta: string;
  /** One of the artist's sets clashes: the ⚠ that expands the sheet. */
  showConflict: boolean;
  /** Web: the ✕ that closes the sheet. */
  showClose: boolean;
  status: InterestStatus;
  /** The content column's width and side padding. */
  width: number;
  padding: number;
};

export type ArtistDetailTitleInputs = {
  artist: DbArtist;
  status: InterestStatus;
  hasConflict: boolean;
  /** The content column: the window's width up to MAX_CONTENT_WIDTH. */
  innerWidth: number;
  padding: number;
  isWeb: boolean;
};

export function artistDetailTitleModel({ artist, status, hasConflict, innerWidth, padding, isWeb }: ArtistDetailTitleInputs): ArtistDetailTitleModel {
  const controls = TITLE_LAYOUT.starWidth
    + (hasConflict ? TITLE_LAYOUT.conflictWidth + TITLE_LAYOUT.gap : 0)
    + (isWeb ? TITLE_LAYOUT.closeWidth : 0);
  const titleWidth = innerWidth - padding * 2 - TITLE_LAYOUT.marginRight - controls;
  const genre = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  return {
    key: artist.artistId,
    name: artist.name,
    fontSize: fitFontSize(artist.name.length, titleWidth, TITLE_LAYOUT.lines, TITLE_LAYOUT.fontSize),
    meta: [genre, country].filter(Boolean).join('  ·  '),
    showConflict: hasConflict,
    showClose: isWeb,
    status,
    width: innerWidth,
    padding,
  };
}
