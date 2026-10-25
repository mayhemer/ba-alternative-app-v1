import type { DbArtist } from '../types/backend';
import type { SharedInterestStatus } from '../adapters/baShareApiAdapter';
import type { InterestStatus } from '../cache/cacheService';
import { matchesScope, type LensScope } from '../utils/interestUtils';
import { sectionLetter } from '../components/SectionSeparator.model';

// ── The artist list: what it lists ────────────────────────────────────────────
//
// The bands (playable artists) of the edition, narrowed by the search and the
// lens, grouped under their letter and sorted. Nothing cached yet is a wait
// ("loading"), never an answer: the filters only ever narrow a loaded lineup, so
// an empty list after them is "No artists found".

export type Section = {
  title: string;
  data: DbArtist[];
};

export type ArtistListModel = {
  /** Nothing cached yet: the list waits rather than answering. */
  loading: boolean;
  sections: Section[];
};

export type ArtistListInputs = {
  artists: DbArtist[];
  query: string;
  scope: LensScope;
  interests: Record<string, string>;
  /** The focused friend's picks, for a friend's lens. */
  friendInterests: Record<string, SharedInterestStatus> | undefined;
};

// Hoisted: localeCompare with options builds a fresh collator on every comparison
// (~50x slower). The default locale is resolved once, at module load.
const LETTER_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });
const NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base', ignorePunctuation: true });

/**
 * Groups artists under their letter, "#" first, each group sorted by name with
 * punctuation ignored. Measured by the performance suite: the collated sort is
 * the most expensive thing the list does, and it re-runs on every keystroke.
 */
export function buildSections(artists: DbArtist[]): Section[] {
  const grouped: Record<string, DbArtist[]> = {};
  for (const artist of artists) {
    const letter = sectionLetter(artist.name);
    if (grouped[letter] === undefined) {
      grouped[letter] = [];
    }
    grouped[letter].push(artist);
  }

  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === '#') { return -1; }
      if (b === '#') { return 1; }
      return LETTER_COLLATOR.compare(a, b);
    })
    .map((letter) => ({
      title: letter,
      data: grouped[letter].sort((a, b) => NAME_COLLATOR.compare(a.name, b.name)),
    }));
}

export function artistListModel({ artists, query, scope, interests, friendInterests }: ArtistListInputs): ArtistListModel {
  let listed = artists.filter((a) => a.isPlayable);
  if (listed.length === 0) {
    return { loading: true, sections: [] };
  }
  if (query.trim() !== '') {
    const q = query.toLowerCase();
    listed = listed.filter((a) => a.name.toLowerCase().includes(q));
  }
  if (scope.kind !== 'all') {
    listed = listed.filter((a) => matchesScope(scope, (interests[a.artistId] ?? 'none') as InterestStatus, friendInterests?.[a.artistId]));
  }
  return { loading: false, sections: buildSections(listed) };
}
