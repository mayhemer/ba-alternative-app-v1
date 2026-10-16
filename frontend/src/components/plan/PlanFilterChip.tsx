import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlanFilters, usePlanPanel } from '../../context/PlanContext';
import { planStrings } from './planStrings';
import { colors } from '../../styling/tokens';

// ── My plan's filter chip (TopBar right slot) ─────────────────────────────────
//
// The lens chip's shape — state on the left, a three-dot handle on the right —
// so it reads as "this view's settings". The state slot shows which filter is on
// without opening anything: the half star (accent, half-filled) while Maybe
// picks are shown, an empty grey star while they are hidden, and the red warning
// sign while only conflicts are shown.

const STATE_SLOT = 26;
const ICON_SIZE = 20;
const DOTS_SIZE = 20;
const SLOT_GAP = 8;

const strings = planStrings();

type ViewProps = {
  showMaybe: boolean;
  conflictsOnly: boolean;
  isOpen: boolean;
  onPress: () => void;
};

function StateIcon({ showMaybe, conflictsOnly }: { showMaybe: boolean; conflictsOnly: boolean }) {
  if (conflictsOnly) {
    return <Ionicons testID="plan-filter-state-conflicts" name="warning-outline" size={ICON_SIZE} color={colors.danger} />;
  }
  if (showMaybe) {
    return <Ionicons testID="plan-filter-state-maybe-on" name="star-half" size={ICON_SIZE} color={colors.accent} />;
  }
  return <Ionicons testID="plan-filter-state-maybe-off" name="star-outline" size={ICON_SIZE} color={colors.muted} />;
}

export function PlanFilterChipView({ showMaybe, conflictsOnly, isOpen, onPress }: ViewProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={strings.filters}
      accessibilityState={{ expanded: isOpen }}
      style={{ flexDirection: 'row', alignItems: 'center', height: 32 }}
    >
      <View style={{ width: STATE_SLOT, height: STATE_SLOT, marginRight: SLOT_GAP, alignItems: 'center', justifyContent: 'center' }}>
        <StateIcon showMaybe={showMaybe} conflictsOnly={conflictsOnly} />
      </View>
      <Ionicons name="ellipsis-vertical" size={DOTS_SIZE} color={isOpen ? colors.accent : colors.textPrimary} />
    </Pressable>
  );
}

export function PlanFilterChip() {
  const { showMaybe, conflictsOnly } = usePlanFilters();
  const { isOpen, toggle } = usePlanPanel();
  const handlePress = useCallback((): void => { toggle(); }, [toggle]);
  return <PlanFilterChipView showMaybe={showMaybe} conflictsOnly={conflictsOnly} isOpen={isOpen} onPress={handlePress} />;
}
