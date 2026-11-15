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

/** The buttons' order in the panel. */
export const PLAN_LEVEL_ORDER: readonly PlanLevel[] = ['all', 'maybe', 'must', 'conflicts'];

// The panel's measures, which its pull preview (PlanFilterSkeleton) draws too.
export const LEVEL_BUTTON_HEIGHT = 48;
export const LEVEL_BUTTON_RADIUS = 8;
export const LEVEL_ICON_SIZE = 24;
/** Between two buttons. */
export const LEVEL_GAP = 8;
/** Inside the panel's card, around its content. */
export const FILTER_PANEL_PADDING = 12;

export function planFilterLevelModels(current: PlanLevel): PlanFilterLevelModel[] {
  return PLAN_LEVEL_ORDER.map((level) => ({
    key: `level-${level}`,
    level,
    label: strings().planFilter[level],
    ...filterGlyph(level),
    selected: level === current,
  }));
}
