import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../../ui/Text';
import { sameProps } from '../../../ui/sameProps';
import { LEVEL_ICON_SIZE, LEVEL_LABEL_SIZE, LEVEL_ROW_PADDING, LEVEL_ROW_RADIUS, type PlanFilterLevelModel } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import { colors } from '../../../styling/tokens';

// ── One row of the plan's filter panel ────────────────────────────────────────
//
// Draws its model (PlanFilterLevel.model.ts): the filter's glyph and name; the
// current filter's row raised, with an accent tick at its end. Given
// `skeletonColor`, the same row as a mock for the panel's preview
// (PlanFilterSkeleton): the name in that colour, the glyph in the model's.

const LABEL_TEXT = { flex: 1, fontSize: LEVEL_LABEL_SIZE, color: colors.textPrimary };
const GLYPH_STYLE = { marginRight: 10 };
const TICK_SIZE = 18;

type Props = {
  item: PlanFilterLevelModel;
  /** Takes the filter, so one stable callback serves all four rows. */
  onPick: (level: PlanLevel) => void;
  /** Draws the row as a mock in this colour. */
  skeletonColor?: string;
};

function PlanFilterLevelBase({ item, onPick, skeletonColor }: Props) {
  const handlePress = useCallback((): void => { onPick(item.level); }, [onPick, item.level]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: item.selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        ...LEVEL_ROW_PADDING,
        borderRadius: LEVEL_ROW_RADIUS,
        backgroundColor: item.selected ? colors.surfaceRaised : 'transparent',
      }}
    >
      <Ionicons testID={`plan-filter-glyph-${item.icon}`} name={item.icon} size={LEVEL_ICON_SIZE} color={item.color} style={GLYPH_STYLE} />
      <Text style={skeletonColor === undefined ? LABEL_TEXT : [LABEL_TEXT, { color: skeletonColor }]}>{item.label}</Text>
      {item.selected && <Ionicons testID={`plan-filter-tick-${item.level}`} name="checkmark" size={TICK_SIZE} color={colors.accent} />}
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanFilterLevel = memo(PlanFilterLevelBase, sameProps);
