import { planStrings } from '../planStrings';
import { filterGlyph, type IconName } from './PlanFilterChip.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';

// ── The filter panel's buttons: what each shows ───────────────────────────────
//
// One button per filter, in this order: All sets, Must-see and Maybe, Must-see
// only, Only conflicts. Glyphs only, the chip's for the same filter; the label
// is for screen readers. The current filter's button is selected.

export type PlanFilterLevelModel = {
  key: `level-${PlanLevel}`;
  /** The filter it applies. */
  level: PlanLevel;
  label: string;
  icon: IconName;
  color: string;
  selected: boolean;
};

const strings = planStrings();

const ORDER: readonly PlanLevel[] = ['all', 'maybe', 'must', 'conflicts'];

const LABELS: Record<PlanLevel, string> = {
  all: strings.filterAll,
  maybe: strings.filterMaybe,
  must: strings.filterMust,
  conflicts: strings.filterConflicts,
};

export function planFilterLevelModels(current: PlanLevel): PlanFilterLevelModel[] {
  return ORDER.map((level) => ({
    key: `level-${level}`,
    level,
    label: LABELS[level],
    ...filterGlyph(level),
    selected: level === current,
  }));
}
