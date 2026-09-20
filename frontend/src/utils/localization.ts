import type {
  DbArtistBioLocalized,
  DbArtistLocalized,
  DbCategoryLocalized,
  DbStageLocalized,
} from '../types/backend';

const DEFAULT_LANG = 'en';

// The API serves language codes upper-case ('EN', 'CS'), so an exact comparison
// against DEFAULT_LANG never matched and every lookup fell through to the first
// entry — which is 'CS'. Compare case-insensitively instead.
function pickLanguage<T extends { language: string }>(
  localized: T[],
  lang: string,
): T | undefined {
  const wanted = lang.toLowerCase();
  return localized.find((l) => l.language.toLowerCase() === wanted);
}

export function getArtistLocalized(
  localized: DbArtistLocalized[],
  field: keyof Omit<DbArtistLocalized, 'language'>,
  lang: string = DEFAULT_LANG,
): string {
  const match = pickLanguage(localized, lang);
  if (match !== undefined) {
    return match[field];
  }
  return localized[0]?.[field] ?? '';
}

export function getCategoryLocalized(
  localized: DbCategoryLocalized[],
  field: keyof Omit<DbCategoryLocalized, 'language'>,
  lang: string = DEFAULT_LANG,
): string {
  const match = pickLanguage(localized, lang);
  if (match !== undefined) {
    return match[field];
  }
  return localized[0]?.[field] ?? '';
}

export function getStageLocalized(
  localized: DbStageLocalized[],
  field: keyof Omit<DbStageLocalized, 'language'>,
  lang: string = DEFAULT_LANG,
): string {
  const match = pickLanguage(localized, lang);
  if (match !== undefined) {
    return match[field];
  }
  return localized[0]?.[field] ?? '';
}

export function getArtistBioLocalized(
  localized: DbArtistBioLocalized[],
  lang: string = DEFAULT_LANG,
): string {
  const match = pickLanguage(localized, lang);
  if (match !== undefined) {
    return match.content;
  }
  return localized[0]?.content ?? '';
}
