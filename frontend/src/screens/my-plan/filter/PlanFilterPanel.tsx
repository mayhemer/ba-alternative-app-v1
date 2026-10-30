import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { usePlanFilters, usePlanPanel } from '../PlanContext';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { planStrings } from '../planStrings';
import { PlanFilterLevel } from './PlanFilterLevel';
import { planFilterLevelModels, type PlanFilterLevelModel } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import {
  colors,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
  OVERLAY_PANEL_RADIUS,
} from '../../../styling/tokens';

// ── My plan's filter panel ────────────────────────────────────────────────────
//
// Drops from under the TopBar like the lens panel, with the same backdrop and
// card, and the same place in AppShell. One row of four buttons, one per
// filter, each drawn from its model (PlanFilterLevel.model.ts). A tap applies
// that filter and closes the panel, back to the list.

const strings = planStrings();

type ViewProps = {
  levels: PlanFilterLevelModel[];
  onPick: (level: PlanLevel) => void;
  onClose: () => void;
};

export function PlanFilterPanelView({ levels, onPick, onClose }: ViewProps) {
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
          flexDirection: 'row',
          gap: 8,
          padding: 12,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        {levels.map((item) => <PlanFilterLevel key={item.key} item={item} onPick={onPick} />)}
      </View>
    </>
  );
}

export function PlanFilterPanel() {
  const { level, setLevel } = usePlanFilters();
  const { isOpen, close } = usePlanPanel();
  const levels = useMemo(() => planFilterLevelModels(level), [level]);
  // Applies the filter and goes back to the list, the current filter too.
  const handlePick = useCallback((picked: PlanLevel): void => {
    setLevel(picked);
    close();
  }, [setLevel, close]);
  if (!isOpen) {
    return null;
  }
  return <PlanFilterPanelView levels={levels} onPick={handlePick} onClose={close} />;
}
