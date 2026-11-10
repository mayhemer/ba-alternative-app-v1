import { strings } from '../../../i18n/strings';
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

const ORDER: readonly PlanLevel[] = ['all', 'maybe', 'must', 'conflicts'];

export function planFilterLevelModels(current: PlanLevel): PlanFilterLevelModel[] {
  return ORDER.map((level) => ({
    key: `level-${level}`,
    level,
    label: strings().planFilter[level],
    ...filterGlyph(level),
    selected: level === current,
  }));
}
