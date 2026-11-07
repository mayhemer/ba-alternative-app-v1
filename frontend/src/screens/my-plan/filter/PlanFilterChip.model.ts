import type Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import { colors } from '../../../styling/tokens';
import { TOPBAR_BUTTON_OPEN_CONTENT } from '../../../ui/topBarButton';

// ── My plan's filter chip: what it shows ──────────────────────────────────────
//
// The state slot tells which filter is on without opening anything, with the
// same glyph as that filter's button in the panel (filterGlyph): a grey outline
// star for All sets, the accent half star for Must-see and Maybe, the accent
// full star for Must-see only, the red warning sign for Only conflicts. While
// the panel is open the chip is drawn open (ui/topBarButton): the glyph and the
// dots black on the accent.

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** One filter's glyph, shared by the chip and the panel's button for it. */
export function filterGlyph(level: PlanLevel): { icon: IconName; color: string } {
  switch (level) {
    case 'all': return { icon: 'star-outline', color: colors.muted };
    case 'maybe': return { icon: 'star-half', color: colors.accent };
    case 'must': return { icon: 'star', color: colors.accent };
    case 'conflicts': return { icon: 'warning-outline', color: colors.danger };
  }
}

export type PlanFilterChipModel = {
  key: 'plan-filter-chip';
  state: { testID: string; icon: IconName; color: string };
  dotsColor: string;
  /** The panel is open. */
  expanded: boolean;
};

type ChipInputs = { level: PlanLevel; isOpen: boolean };

export function planFilterChipModel({ level, isOpen }: ChipInputs): PlanFilterChipModel {
  const glyph = filterGlyph(level);
  return {
    key: 'plan-filter-chip',
    state: { testID: `plan-filter-state-${level}`, ...glyph, color: isOpen ? TOPBAR_BUTTON_OPEN_CONTENT : glyph.color },
    dotsColor: isOpen ? TOPBAR_BUTTON_OPEN_CONTENT : colors.textPrimary,
    expanded: isOpen,
  };
}
