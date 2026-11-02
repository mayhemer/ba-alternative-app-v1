import type { DbArtist } from '../../types/backend';
import type { SharedInterestStatus } from '../../adapters/baShareApiAdapter';
import type { InterestStatus } from '../../cache/cacheService';
import { matchesScope, type LensScope } from '../../lib/interestUtils';
import { sectionLetter } from './SectionSeparator.model';

// ── The artist list: what it lists ────────────────────────────────────────────
//
// The bands (playable artists) of the edition, narrowed by the lens, grouped
// under their letter and sorted. Nothing cached yet is a wait
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

// Built in two steps so a screen can keep the first across picks: a pick only
// changes the lens step's input, and the lens never needs to sort again — it
// keeps the sections' order and drops a letter it empties.

/** Step one: the bands, grouped and sorted. */
export function sortedArtistList({ artists }: Pick<ArtistListInputs, 'artists'>): ArtistListModel {
  const listed = artists.filter((a) => a.isPlayable);
  if (listed.length === 0) {
    return { loading: true, sections: [] };
  }
  return { loading: false, sections: buildSections(listed) };
}

/** Step two: the lens over a sorted list. Everything hands back the same list, unchanged. */
export function withLens(
  sorted: ArtistListModel,
  { scope, interests, friendInterests }: Pick<ArtistListInputs, 'scope' | 'interests' | 'friendInterests'>,
): ArtistListModel {
  if (scope.kind === 'all' || sorted.loading) {
    return sorted;
  }
  const sections: Section[] = [];
  for (const section of sorted.sections) {
    const data = section.data.filter((a) => matchesScope(scope, (interests[a.artistId] ?? 'none') as InterestStatus, friendInterests?.[a.artistId]));
    if (data.length > 0) {
      sections.push({ title: section.title, data });
    }
  }
  return { loading: false, sections };
}

export function artistListModel({ artists, scope, interests, friendInterests }: ArtistListInputs): ArtistListModel {
  return withLens(sortedArtistList({ artists }), { scope, interests, friendInterests });
}
