import { gapHeight } from './PlanGap.model';
import type { DbEvent } from '../../types/backend';

// ── A day cap: what it shows ──────────────────────────────────────────────────
//
// A bare rail before the day's first set (a ring) or after its last (a square),
// with no time behind it.

/** The caps are drawn as long as a gap of this many minutes. */
const CAP_MINUTES = 20;

export type PlanCapModel = {
  kind: 'cap';
  key: string;
  edge: 'start' | 'end';
  height: number;
  /** The first set of the clash group right under it: the "Conflict" title it draws. */
  conflictTitle: DbEvent | null;
};

export function planCapModel(edge: 'start' | 'end'): PlanCapModel {
  return { kind: 'cap', key: `cap-${edge}`, edge, height: gapHeight(CAP_MINUTES), conflictTitle: null };
}
