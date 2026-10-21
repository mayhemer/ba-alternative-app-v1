import { planStrings } from './planStrings';

// ── An empty day: what it shows ───────────────────────────────────────────────

const strings = planStrings();

export const EMPTY_HEIGHT = 90;

export type PlanEmptyModel = { kind: 'empty'; key: 'empty'; height: number; text: string };

export function planEmptyModel(conflictsOnly: boolean): PlanEmptyModel {
  return { kind: 'empty', key: 'empty', height: EMPTY_HEIGHT, text: conflictsOnly ? strings.emptyConflicts : strings.empty };
}
