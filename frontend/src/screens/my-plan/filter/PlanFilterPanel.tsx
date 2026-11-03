import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { usePlanFilters, usePlanPanel } from '../PlanContext';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { planStrings } from '../planStrings';
import { PlanFilterLevel } from './PlanFilterLevel';
import { MyScheduleShare } from '../../../features/social/MyScheduleShare';
import { SearchEntry } from '../../../features/search/SearchEntry';
import { SEARCH_ENTRY_DOCK_HEIGHT } from '../../../features/search/SearchDock.model';
import { planFilterLevelModels, type PlanFilterLevelModel } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import {
  colors,
  OVERLAY_BACKDROP,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
  OVERLAY_PANEL_RADIUS,
} from '../../../styling/tokens';

// ── My plan's filter panel ────────────────────────────────────────────────────
//
// Drops from under the TopBar like the lens panel, with the same backdrop and
// card, and the same place in AppShell; the search field at the bottom edge
// (features/search/SearchEntry). One row of four buttons, one per
// filter, each drawn from its model (PlanFilterLevel.model.ts). A tap applies
// that filter and closes the panel, back to the list. Below them, the lens
// panel's "My schedule" section (MyScheduleShare), passed in as children.

const strings = planStrings();

type ViewProps = {
  levels: PlanFilterLevelModel[];
  onPick: (level: PlanLevel) => void;
  onClose: () => void;
  /** Drawn outside the card, over the backdrop: the search field at the bottom edge. */
  dock?: React.ReactNode;
  /** Drawn below the filter buttons. */
  children?: React.ReactNode;
};

export function PlanFilterPanelView({ levels, onPick, onClose, dock, children }: ViewProps) {
  const { isWide } = useLayoutMode();
  return (
    <>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={strings.close}
        style={{ position: 'absolute', inset: 0, backgroundColor: OVERLAY_BACKDROP }}
      />
      {/* The frame ends above the search field; the card shrinks to fit it. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          bottom: SEARCH_ENTRY_DOCK_HEIGHT,
          left: isWide ? undefined : OVERLAY_PANEL_MARGIN,
          right: OVERLAY_PANEL_MARGIN,
          width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
        }}
      >
        <View
          style={{
            flexShrink: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: OVERLAY_PANEL_RADIUS,
            padding: 12,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {levels.map((item) => <PlanFilterLevel key={item.key} item={item} onPick={onPick} />)}
          </View>
          {children}
        </View>
      </View>
      {dock}
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
  return (
    <PlanFilterPanelView levels={levels} onPick={handlePick} onClose={close} dock={<SearchEntry />}>
      <MyScheduleShare onClose={close} />
    </PlanFilterPanelView>
  );
}
