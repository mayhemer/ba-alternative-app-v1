import React, { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { sameProps } from '../sameProps';
import type { PlanFilterSwitchModel } from './PlanFilterSwitch.model';
import type { PlanFilters } from '../../store/uiStatePersistence';
import { colors } from '../../styling/tokens';

// ── One switch of the plan's filter panel ─────────────────────────────────────
//
// Draws its model (PlanFilterSwitch.model.ts): icon, label and a track whose
// knob sits right while on. Dimmed and inert while disabled.

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 22;
const KNOB = 18;
const ICON_SIZE = 20;

type Props = {
  item: PlanFilterSwitchModel;
  /** Takes the filter, so one stable callback serves both switches. */
  onToggle: (filter: keyof PlanFilters) => void;
};

function PlanFilterSwitchBase({ item, onToggle }: Props) {
  const handlePress = useCallback((): void => { onToggle(item.filter); }, [onToggle, item.filter]);
  return (
    <Pressable
      onPress={handlePress}
      disabled={item.disabled}
      accessibilityRole="switch"
      accessibilityLabel={item.label}
      accessibilityState={{ checked: item.on, disabled: item.disabled }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, opacity: item.disabled ? 0.4 : 1 }}
    >
      <Ionicons name={item.icon} size={ICON_SIZE} color={item.color} />
      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>{item.label}</Text>
      <View style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: item.on ? item.color : colors.borderMid }}>
        <View
          style={{
            position: 'absolute',
            top: (TRACK_HEIGHT - KNOB) / 2,
            left: item.on ? TRACK_WIDTH - KNOB - 2 : 2,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: colors.white,
          }}
        />
      </View>
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanFilterSwitch = memo(PlanFilterSwitchBase, sameProps);
