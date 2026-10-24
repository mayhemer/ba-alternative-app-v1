import type Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import { colors } from '../../styling/tokens';

// ── My plan's filter chip: what it shows ──────────────────────────────────────
//
// The state slot tells which filter is on without opening anything: the red
// warning sign while only conflicts are shown (whatever the Maybe switch says),
// else the accent half star while Maybe picks are shown, else a grey outline
// star. The three dots turn accent while the panel is open.

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type PlanFilterChipModel = {
  key: 'plan-filter-chip';
  state: { testID: string; icon: IconName; color: string };
  dotsColor: string;
  /** The panel is open. */
  expanded: boolean;
};

type ChipInputs = { showMaybe: boolean; conflictsOnly: boolean; isOpen: boolean };

function stateOf(showMaybe: boolean, conflictsOnly: boolean): PlanFilterChipModel['state'] {
  if (conflictsOnly) {
    return { testID: 'plan-filter-state-conflicts', icon: 'warning-outline', color: colors.danger };
  }
  if (showMaybe) {
    return { testID: 'plan-filter-state-maybe-on', icon: 'star-half', color: colors.accent };
  }
  return { testID: 'plan-filter-state-maybe-off', icon: 'star-outline', color: colors.muted };
}

export function planFilterChipModel({ showMaybe, conflictsOnly, isOpen }: ChipInputs): PlanFilterChipModel {
  return {
    key: 'plan-filter-chip',
    state: stateOf(showMaybe, conflictsOnly),
    dotsColor: isOpen ? colors.accent : colors.textPrimary,
    expanded: isOpen,
  };
}
