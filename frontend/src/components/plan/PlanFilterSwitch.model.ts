import { planStrings } from './planStrings';
import type { IconName } from './PlanFilterChip.model';
import type { PlanFilters } from '../../store/uiStatePersistence';
import { colors } from '../../styling/tokens';

// ── The filter panel's switches: what each shows ──────────────────────────────
//
// Show Maybe picks (half star, accent), then Show only conflicts (warning sign,
// red). "Show only conflicts" makes the Maybe switch moot: it is disabled
// meanwhile, and still says where it stands.

export type PlanFilterSwitchModel = {
  key: 'switch-maybe' | 'switch-conflicts';
  /** The filter it flips. */
  filter: keyof PlanFilters;
  label: string;
  icon: IconName;
  /** The icon's and the switched-on track's colour. */
  color: string;
  on: boolean;
  disabled: boolean;
};

const strings = planStrings();

export function planFilterSwitchModels({ showMaybe, conflictsOnly }: PlanFilters): PlanFilterSwitchModel[] {
  return [
    { key: 'switch-maybe', filter: 'showMaybe', label: strings.showMaybe, icon: 'star-half', color: colors.accent, on: showMaybe, disabled: conflictsOnly },
    { key: 'switch-conflicts', filter: 'conflictsOnly', label: strings.conflictsOnly, icon: 'warning-outline', color: colors.danger, on: conflictsOnly, disabled: false },
  ];
}
