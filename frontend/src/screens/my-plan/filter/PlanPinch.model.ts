import { strings } from '../../../i18n/strings';
import type { PinchDirection } from '../../../ui/PinchStep.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';

// ── A pinch on My plan: the filter it steps to, and what the toast says ───────
//
// The filters of picks form a scale from widest to narrowest: All sets, All my
// picks, Only what I must see. A pinch in narrows one step, a pinch out widens
// one step, and each end holds. Only conflicts is off that scale, narrower than
// Must-see only (it lists only clashing Must-sees): a pinch out leaves it for
// Must-see only, a pinch in keeps it.

/** The scale, widest first. */
const PINCH_SCALE: readonly PlanLevel[] = ['all', 'maybe', 'must'];

export function pinchedLevel(level: PlanLevel, direction: PinchDirection): PlanLevel {
  if (level === 'conflicts') {
    return direction === 'out' ? 'must' : 'conflicts';
  }
  const index = PINCH_SCALE.indexOf(level);
  const next = direction === 'in' ? Math.min(index + 1, PINCH_SCALE.length - 1) : Math.max(index - 1, 0);
  return PINCH_SCALE[next];
}

/** The toast after a pinch: the filter now on, also when the pinch hit an end and changed nothing. */
export function pinchToast(level: PlanLevel): string {
  return strings().planFilter.showing[level];
}
