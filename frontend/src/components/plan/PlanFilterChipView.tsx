import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { planStrings } from './planStrings';
import { sameProps } from '../sameProps';
import type { PlanFilterChipModel } from './PlanFilterChip.model';

// ── My plan's filter chip, drawn ──────────────────────────────────────────────
//
// The lens chip's shape — state on the left, a three-dot handle on the right —
// so it reads as "this view's settings". Draws its model (PlanFilterChip.model.ts).

const STATE_SLOT = 26;
const ICON_SIZE = 20;
const DOTS_SIZE = 20;
const SLOT_GAP = 8;

const strings = planStrings();

type Props = { item: PlanFilterChipModel; onPress: () => void };

function PlanFilterChipViewBase({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={strings.filters}
      accessibilityState={{ expanded: item.expanded }}
      style={{ flexDirection: 'row', alignItems: 'center', height: 32 }}
    >
      <View style={{ width: STATE_SLOT, height: STATE_SLOT, marginRight: SLOT_GAP, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons testID={item.state.testID} name={item.state.icon} size={ICON_SIZE} color={item.state.color} />
      </View>
      <Ionicons name="ellipsis-vertical" size={DOTS_SIZE} color={item.dotsColor} />
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanFilterChipView = memo(PlanFilterChipViewBase, sameProps);
