import { strings } from '../../i18n/strings';
import { filterGlyph, type IconName } from './filter/PlanFilterChip.model';
import type { PlanLevel } from '../../store/uiStatePersistence';

// ── An empty day: what it shows ───────────────────────────────────────────────
//
// Under All sets and Only conflicts, one plain sentence. Under the two filters
// of picks, a title saying nothing is picked for the day (never "planned": that
// reads as if nothing plays), that the filter is why the list is empty (a line
// of its own), and on the next line two links: the artist list, and the filter
// panel, followed by the filter button's own glyph so it
// is recognised in the top bar. The link opens the panel and changes no filter:
// the user picks one there. The height holds the longest (Czech, three lines on
// a phone).

const EMPTY_HEIGHT = 90;
const NOTHING_PICKED_HEIGHT = 150;

/** Where a link in the empty day's sentence goes: the artist list, or the filter panel. */
export type PlanEmptyAction = 'artists' | 'filter';

/** A piece of the sentence: plain text (action null) or a link, with the filter's glyph after it. */
export type PlanEmptyPart = {
  text: string;
  action: PlanEmptyAction | null;
  glyph: { icon: IconName; color: string } | null;
};

export type PlanEmptyModel = {
  kind: 'empty';
  key: 'empty';
  height: number;
  /** Over the sentence, only under a filter of picks. */
  title: string | null;
  /** A line of its own between the title and the sentence, only under a filter of picks. */
  intro: string | null;
  /** Everything after the title, as read aloud. */
  text: string;
  parts: PlanEmptyPart[];
};

function plain(text: string): PlanEmptyModel {
  return { kind: 'empty', key: 'empty', height: EMPTY_HEIGHT, title: null, intro: null, text, parts: [{ text, action: null, glyph: null }] };
}

export function planEmptyModel(level: PlanLevel): PlanEmptyModel {
  switch (level) {
    case 'all':
      return plain(strings().myPlanScreen.empty);
    case 'conflicts':
      return plain(strings().myPlanScreen.emptyConflicts);
    case 'must':
    case 'maybe': {
      const s = strings().myPlanScreen.nothingPicked;
      const parts: PlanEmptyPart[] = [
        { text: s.pickArtists, action: 'artists', glyph: null },
        { text: s.pickArtistsRest, action: null, glyph: null },
        { text: s.changeFilter, action: 'filter', glyph: filterGlyph(level) },
      ];
      const sentence = parts.map((p) => p.text).join('');
      return { kind: 'empty', key: 'empty', height: NOTHING_PICKED_HEIGHT, title: s.title, intro: s.intro, text: `${s.intro} ${sentence}`, parts };
    }
  }
}
