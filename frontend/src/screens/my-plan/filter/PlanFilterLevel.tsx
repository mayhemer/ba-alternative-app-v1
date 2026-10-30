import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sameProps } from '../../../ui/sameProps';
import type { PlanFilterLevelModel } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import { colors } from '../../../styling/tokens';

// ── One button of the plan's filter panel ─────────────────────────────────────
//
// Draws its model (PlanFilterLevel.model.ts): the filter's glyph, in an accent
// border on a raised background while it is the current filter.

const ICON_SIZE = 24;
const HEIGHT = 48;

type Props = {
  item: PlanFilterLevelModel;
  /** Takes the filter, so one stable callback serves all four buttons. */
  onPick: (level: PlanLevel) => void;
};

function PlanFilterLevelBase({ item, onPick }: Props) {
  const handlePress = useCallback((): void => { onPick(item.level); }, [onPick, item.level]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: item.selected }}
      style={{
        flex: 1,
        height: HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: item.selected ? colors.accent : colors.borderMid,
        backgroundColor: item.selected ? colors.border : colors.surfaceRaised,
      }}
    >
      <Ionicons name={item.icon} size={ICON_SIZE} color={item.color} />
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanFilterLevel = memo(PlanFilterLevelBase, sameProps);
