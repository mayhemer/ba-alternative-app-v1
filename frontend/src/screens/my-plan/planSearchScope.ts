import type { SearchScope } from '../../features/search/searchScope';
import { planLevelLists, type PickLevel } from '../../lib/plan';
import type { PlanLevel } from '../../store/uiStatePersistence';
import type { DbEvent } from '../../types/backend';
import { strings } from '../../i18n/strings';

// ── What My plan tells search ─────────────────────────────────────────────────
//
// Its primary list: every set any of its filters can list (planPicks with the
// unpicked bands, the rule the list and the conflicts share). Its views: its
// filter from where it is out to All sets, each listing by planLevelLists, the
// rule buildPlanDay lists by. A landing widens the filter to the first that
// lists the set, then asks the screen to land on its row (requestSet). Anything
// else (an unpicked support set, a "don't go", a support set over 2 h) goes under where
// it is and opens the artist sheet.

/** The filters from the narrowest out. */
const LADDER: PlanLevel[] = ['conflicts', 'must', 'maybe', 'all'];

export type PlanSearchInputs = {
  level: PlanLevel;
  /** Every set the plan can list (eventId), with its level: planPicks(…, unpicked = true). */
  listable: ReadonlyMap<string, PickLevel>;
  /** The clashing sets (by eventId), from the shared conflict calculation. */
  clashing: { has: (eventId: string) => boolean };
  setLevel: (level: PlanLevel) => void;
  /** Shows the set's day and scrolls to its row. */
  land: (event: DbEvent) => void;
};

export function planSearchScope({ level, listable, clashing, setLevel, land }: PlanSearchInputs): SearchScope {
  const ladder = LADDER.slice(LADDER.indexOf(level));
  return {
    title: strings().screens.myPlan,
    hereOpens: 'land',
    elsewhereOpens: 'details',
    contains: (ref) => ref.event !== null && listable.has(ref.event.eventId),
    views: ladder.map((step, i) => ({
      shows: (ref) => {
        if (ref.event === null) {
          return false;
        }
        const pick = listable.get(ref.event.eventId);
        return pick !== undefined && planLevelLists(step, pick, clashing.has(ref.event.eventId));
      },
      tag: i === 0 ? null : strings().search.tagFilter(strings().planFilter[step]),
    })),
    reveal: ({ event }, view) => {
      if (view > 0) {
        setLevel(ladder[view]);
      }
      land(event);
    },
    openElsewhere: () => undefined,
  };
}
