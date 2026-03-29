import type { DbArtistLocalized, DbCategoryLocalized, DbStageLocalized } from '../types/backend';

const DEFAULT_LANG = 'en';

export function getArtistLocalized(
  localized: DbArtistLocalized[],
  field: keyof Omit<DbArtistLocalized, 'language'>,
  lang: string = DEFAULT_LANG,
): string {
  const match = localized.find((l) => l.language === lang);
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
  const match = localized.find((l) => l.language === lang);
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
  const match = localized.find((l) => l.language === lang);
  if (match !== undefined) {
    return match[field];
  }
  return localized[0]?.[field] ?? '';
}
