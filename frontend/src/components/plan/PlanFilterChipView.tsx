import React, { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { planStrings } from './planStrings';
import { TopBarChip } from '../layout/TopBarChip';
import { sameProps } from '../sameProps';
import type { PlanFilterChipModel } from './PlanFilterChip.model';

// ── My plan's filter chip, drawn ──────────────────────────────────────────────
//
// The lens chip's shape — state on the left, a three-dot handle on the right —
// so it reads as "this view's settings": the same frame (TopBarChip). Draws
// its model (PlanFilterChip.model.ts).

const ICON_SIZE = 20;

const strings = planStrings();

type Props = { item: PlanFilterChipModel; onPress: () => void };

function PlanFilterChipViewBase({ item, onPress }: Props) {
  return (
    <TopBarChip
      onPress={onPress}
      accessibilityLabel={strings.filters}
      accessibilityState={{ expanded: item.expanded }}
      dotsColor={item.dotsColor}
    >
      <Ionicons testID={item.state.testID} name={item.state.icon} size={ICON_SIZE} color={item.state.color} />
    </TopBarChip>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanFilterChipView = memo(PlanFilterChipViewBase, sameProps);
