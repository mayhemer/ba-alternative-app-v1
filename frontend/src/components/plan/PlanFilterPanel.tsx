import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { usePlanFilters, usePlanPanel } from '../../context/PlanContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { planStrings } from './planStrings';
import {
  colors,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
  OVERLAY_PANEL_RADIUS,
} from '../../styling/tokens';

// ── My plan's filter panel ────────────────────────────────────────────────────
//
// Drops from under the TopBar like the lens panel, with the same backdrop and
// card, and the same place in AppShell. Two switches; "Show only conflicts"
// makes the Maybe switch moot, so it is dimmed and disabled meanwhile.

const strings = planStrings();

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 22;
const KNOB = 18;

type SwitchRowProps = {
  label: string;
  icon: React.ReactNode;
  on: boolean;
  onColor: string;
  disabled?: boolean;
  onPress: () => void;
};

function SwitchRow({ label, icon, on, onColor, disabled = false, onPress }: SwitchRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, opacity: disabled ? 0.4 : 1 }}
    >
      {icon}
      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>{label}</Text>
      <View style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: on ? onColor : colors.borderMid }}>
        <View
          style={{
            position: 'absolute',
            top: (TRACK_HEIGHT - KNOB) / 2,
            left: on ? TRACK_WIDTH - KNOB - 2 : 2,
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

type ViewProps = {
  showMaybe: boolean;
  conflictsOnly: boolean;
  onToggleMaybe: () => void;
  onToggleConflicts: () => void;
  onClose: () => void;
};

export function PlanFilterPanelView({ showMaybe, conflictsOnly, onToggleMaybe, onToggleConflicts, onClose }: ViewProps) {
  const { isWide } = useLayoutMode();
  return (
    <>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={strings.close}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
      />
      <View
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          left: isWide ? undefined : OVERLAY_PANEL_MARGIN,
          right: OVERLAY_PANEL_MARGIN,
          width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: OVERLAY_PANEL_RADIUS,
          paddingHorizontal: 16,
          paddingVertical: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <SwitchRow
          label={strings.showMaybe}
          icon={<Ionicons name="star-half" size={20} color={colors.accent} />}
          on={showMaybe}
          onColor={colors.accent}
          disabled={conflictsOnly}
          onPress={onToggleMaybe}
        />
        <SwitchRow
          label={strings.conflictsOnly}
          icon={<Ionicons name="warning-outline" size={20} color={colors.danger} />}
          on={conflictsOnly}
          onColor={colors.danger}
          onPress={onToggleConflicts}
        />
      </View>
    </>
  );
}

export function PlanFilterPanel() {
  const { showMaybe, conflictsOnly, toggleMaybe, toggleConflictsOnly } = usePlanFilters();
  const { isOpen, close } = usePlanPanel();
  if (!isOpen) {
    return null;
  }
  return (
    <PlanFilterPanelView
      showMaybe={showMaybe}
      conflictsOnly={conflictsOnly}
      onToggleMaybe={toggleMaybe}
      onToggleConflicts={toggleConflictsOnly}
      onClose={close}
    />
  );
}
