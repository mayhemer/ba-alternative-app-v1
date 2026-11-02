import { onSupportProgram } from '../../lib/timelineJump';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── What a screen tells search about itself ───────────────────────────────────
//
// Search places every result the same way on every screen (placeResult); a
// screen only describes itself, with the same rules it draws by:
//
//   - contains: its primary list, as a test (Program: bands' sets; My plan: the
//     sets any of its filters can list; …);
//   - views: its own filter, from how it is set now out to its widest setting;
//     the first that shows a set says how far a landing widens it;
//   - reveal / openElsewhere: what a tap does.
//
// A set the screen does not contain, or no view of it shows, goes under where it
// is: the Program or the Support program. The screen registers its scope while
// focused (useSearchScope in SearchContext).

/** A result: a set, or an artist with no set (event null). */
export type SetRef = { artist: DbArtist; event: DbEvent | null };

export type ScopeView = {
  shows: (ref: SetRef) => boolean;
  /** What landing through this view widens, as the row's tag; null for the screen as it is. */
  tag: string | null;
};

export type SearchScope = {
  /** The screen's own section's title. */
  title: string;
  /** A tap in the screen's own section: land on the set here, or open its details (Artists). */
  hereOpens: 'land' | 'details';
  /** A tap in the other sections: switch to that timeline there, or open details. */
  elsewhereOpens: 'switch' | 'details';
  contains: (ref: SetRef) => boolean;
  views: ScopeView[];
  /** Lands on a set of the screen's own section, widening through `views[view]` first. */
  reveal: (ref: { artist: DbArtist; event: DbEvent }, view: number) => void;
  /** A set of another section, by `elsewhereOpens`. */
  openElsewhere: (ref: { artist: DbArtist; event: DbEvent }) => void;
};

export type Placement =
  | { section: 'here'; view: number }
  | { section: 'program' | 'support' };

export function placeResult(scope: SearchScope, ref: SetRef): Placement {
  if (scope.contains(ref)) {
    const view = scope.views.findIndex((v) => v.shows(ref));
    if (view !== -1) {
      return { section: 'here', view };
    }
  }
  return { section: onSupportProgram(ref.artist) ? 'support' : 'program' };
}
