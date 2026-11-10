import { strings } from '../../i18n/strings';

// ── An empty day: what it shows ───────────────────────────────────────────────

const EMPTY_HEIGHT = 90;

export type PlanEmptyModel = { kind: 'empty'; key: 'empty'; height: number; text: string };

export function planEmptyModel(conflictsOnly: boolean): PlanEmptyModel {
  return { kind: 'empty', key: 'empty', height: EMPTY_HEIGHT, text: conflictsOnly ? strings().myPlanScreen.emptyConflicts : strings().myPlanScreen.empty };
}
