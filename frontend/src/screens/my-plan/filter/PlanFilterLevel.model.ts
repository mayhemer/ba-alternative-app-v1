import { strings } from '../../../i18n/strings';
import { filterGlyph, type IconName } from './PlanFilterChip.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';

// ── The filter panel's rows: what each shows ──────────────────────────────────
//
// One row per filter, in this order: All sets, Must-see and Maybe, Must-see
// only, Only conflicts. Each shows the chip's glyph for that filter and the
// filter's name, which screen readers read too. The current filter's row is
// selected: raised and ticked.

export type PlanFilterLevelModel = {
  key: `level-${PlanLevel}`;
  /** The filter it applies. */
  level: PlanLevel;
  label: string;
  icon: IconName;
  color: string;
  selected: boolean;
};

/** The buttons' order in the panel. */
export const PLAN_LEVEL_ORDER: readonly PlanLevel[] = ['all', 'maybe', 'must', 'conflicts'];

// The panel's measures, which its pull preview (PlanFilterSkeleton) draws too.
// A row is the lens panel's source row (features/social/LensScopeRow), with the
// filter's glyph where that has its radio.
export const LEVEL_ROW_PADDING = { paddingVertical: 10, paddingHorizontal: 8 };
export const LEVEL_ROW_RADIUS = 8;
export const LEVEL_ICON_SIZE = 20;
export const LEVEL_LABEL_SIZE = 15;
/** Inside the panel's card, around its content. */
export const FILTER_PANEL_PADDING = 12;

/** `current` null: no row selected (the panel's preview). */
export function planFilterLevelModels(current: PlanLevel | null): PlanFilterLevelModel[] {
  return PLAN_LEVEL_ORDER.map((level) => ({
    key: `level-${level}`,
    level,
    label: strings().planFilter[level],
    ...filterGlyph(level),
    selected: level === current,
  }));
}
