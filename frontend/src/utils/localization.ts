import type {
  DbArtistBioLocalized,
  DbArtistLocalized,
  DbCategoryLocalized,
  DbStageLocalized,
} from '../types/backend';
import { appLanguage, FALLBACK_LANGUAGE } from '../i18n/language';

// ── Picking the API's localized entries ───────────────────────────────────────
//
// The API sends some fields once per language (artist genre and country, stage
// and category names, bios). These pick the entry in the language the app shows
// (i18n/language.ts), else the English one, else the first. The API writes the
// codes upper case ('EN', 'CS') and lists Czech first, so the match ignores case
// and never relies on the order.

function pickLanguage<T extends { language: string }>(
  localized: T[],
  lang: string,
): T | undefined {
  const matches = (wanted: string) => (l: T) => l.language.toLowerCase() === wanted;
  return localized.find(matches(lang.toLowerCase()))
    ?? localized.find(matches(FALLBACK_LANGUAGE))
    ?? localized[0];
}

export function getArtistLocalized(
  localized: DbArtistLocalized[],
  field: keyof Omit<DbArtistLocalized, 'language'>,
  lang: string = appLanguage(),
): string {
  return pickLanguage(localized, lang)?.[field] ?? '';
}

export function getCategoryLocalized(
  localized: DbCategoryLocalized[],
  field: keyof Omit<DbCategoryLocalized, 'language'>,
  lang: string = appLanguage(),
): string {
  return pickLanguage(localized, lang)?.[field] ?? '';
}

export function getStageLocalized(
  localized: DbStageLocalized[],
  field: keyof Omit<DbStageLocalized, 'language'>,
  lang: string = appLanguage(),
): string {
  return pickLanguage(localized, lang)?.[field] ?? '';
}

export function getArtistBioLocalized(
  localized: DbArtistBioLocalized[],
  lang: string = appLanguage(),
): string {
  return pickLanguage(localized, lang)?.content ?? '';
}
