// ── Search copy ───────────────────────────────────────────────────────────────
//
// Every string the search shows, so a later i18n pass is a drop-in. English
// today, as the rest of the app (utils/localization DEFAULT_LANG). A widening
// tag names the screen's own filter, so My plan passes its filter's name in.

export const searchStrings = {
  entry: 'Search',
  placeholder: 'Bands, films, workshops…',
  close: 'Close search',
  program: 'Program',
  supportProgram: 'Support Program',
  bands: 'Bands',
  inProgram: 'In the Program',
  inSupportProgram: 'In the Support Program',
  opensThere: 'opens there',
  opensDetails: 'opens details',
  nothingFound: (query: string): string => `Nothing found for “${query}”`,
  more: (count: number): string => `${count} more. Type more to narrow it down.`,
  tagLens: 'Lens → Everything',
  tagLane: 'Shows its lane',
  tagFilter: (filterName: string): string => `Filter → ${filterName}`,
} as const;
