import type { SearchScope } from '../../src/features/search/searchScope';

// ── A screen's search scope, for the search's own perf tests ──────────────────
//
// The Program's shape: bands are this screen's, landing as they are; the rest
// goes under where it is. Taps do nothing: the tests measure the results, not
// a landing.

export const PROGRAM_LIKE_SCOPE: SearchScope = {
  title: 'Program',
  hereOpens: 'land',
  elsewhereOpens: 'switch',
  contains: (ref) => ref.artist.isPlayable,
  views: [{ shows: () => true, tag: null }],
  reveal: () => undefined,
  openElsewhere: () => undefined,
};
