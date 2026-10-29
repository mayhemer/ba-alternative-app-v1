import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { usePlanFilters, usePlanPanel } from '../PlanContext';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { planStrings } from '../planStrings';
import { PlanFilterSwitch } from './PlanFilterSwitch';
import { planFilterSwitchModels, type PlanFilterSwitchModel } from './PlanFilterSwitch.model';
import type { PlanFilters } from '../../../store/uiStatePersistence';
import {
  colors,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
  OVERLAY_PANEL_RADIUS,
} from '../../../styling/tokens';

// ── My plan's filter panel ────────────────────────────────────────────────────
//
// Drops from under the TopBar like the lens panel, with the same backdrop and
// card, and the same place in AppShell. Two switches, each drawn from its model
// (PlanFilterSwitch.model.ts).

const strings = planStrings();

type ViewProps = {
  switches: PlanFilterSwitchModel[];
  onToggle: (filter: keyof PlanFilters) => void;
  onClose: () => void;
};

export function PlanFilterPanelView({ switches, onToggle, onClose }: ViewProps) {
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
        {switches.map((item) => <PlanFilterSwitch key={item.key} item={item} onToggle={onToggle} />)}
      </View>
    </>
  );
}

export function PlanFilterPanel() {
  const { showMaybe, conflictsOnly, toggleMaybe, toggleConflictsOnly } = usePlanFilters();
  const { isOpen, close } = usePlanPanel();
  const switches = useMemo(() => planFilterSwitchModels({ showMaybe, conflictsOnly }), [showMaybe, conflictsOnly]);
  const handleToggle = useCallback((filter: keyof PlanFilters): void => {
    if (filter === 'showMaybe') {
      toggleMaybe();
    } else {
      toggleConflictsOnly();
    }
  }, [toggleMaybe, toggleConflictsOnly]);
  if (!isOpen) {
    return null;
  }
  return <PlanFilterPanelView switches={switches} onToggle={handleToggle} onClose={close} />;
}
