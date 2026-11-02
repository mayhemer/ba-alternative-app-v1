import type { SearchScope, SetRef } from '../../features/search/searchScope';
import { searchStrings } from '../../features/search/searchStrings';
import { isRemovedByLens, type LensScope } from '../../lib/interestUtils';
import { onSupportProgram, timelineJump, type TimelineJump } from '../../lib/timelineJump';
import type { InterestStatus } from '../../cache/cacheService';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── What a timeline tells search ──────────────────────────────────────────────
//
// Its primary list: its side's sets (the bands' on the Program, the rest on the
// Support Program), artists with no set included. Its own view: what it draws,
// so neither a hidden lane's sets nor my "don't go" under My picks
// (isRemovedByLens, the rule TimelineDay.model draws by). Wider: the lanes all
// shown; then the lens on Everything too. A landing widens that much, then
// jumps (useJumpToTimeline), which scrolls to the set and highlights it. A set
// on the other timeline switches there, widened the same way.

export type TimelineSearchInputs = {
  /** The Support Program; else the Program. */
  support: boolean;
  lens: LensScope;
  interests: Record<string, string>;
  hidden: ReadonlySet<string>;
  setLens: (scope: LensScope) => void;
  /** Shows a hidden lane again. */
  showLane: (categoryId: string) => void;
  jump: (event: DbEvent, jump: TimelineJump) => void;
};

export function timelineSearchScope({ support, lens, interests, hidden, setLens, showLane, jump }: TimelineSearchInputs): SearchScope {
  const statusOf = (artist: DbArtist): InterestStatus => (interests[artist.artistId] ?? 'none') as InterestStatus;
  const removed = (ref: SetRef): boolean => ref.event !== null && isRemovedByLens(lens, statusOf(ref.artist));
  const inHiddenLane = (ref: SetRef): boolean => ref.event !== null && hidden.has(ref.event.categoryId);

  const widenAndJump = (artist: DbArtist, event: DbEvent): void => {
    if (hidden.has(event.categoryId)) {
      showLane(event.categoryId);
    }
    if (isRemovedByLens(lens, statusOf(artist))) {
      setLens({ kind: 'all' });
    }
    jump(event, timelineJump(artist, event));
  };

  return {
    title: support ? searchStrings.supportProgram : searchStrings.program,
    hereOpens: 'land',
    elsewhereOpens: 'switch',
    contains: (ref) => onSupportProgram(ref.artist) === support,
    views: [
      { shows: (ref) => !inHiddenLane(ref) && !removed(ref), tag: null },
      { shows: (ref) => !removed(ref), tag: searchStrings.tagLane },
      { shows: () => true, tag: searchStrings.tagLens },
    ],
    reveal: ({ artist, event }) => { widenAndJump(artist, event); },
    openElsewhere: ({ artist, event }) => { widenAndJump(artist, event); },
  };
}
