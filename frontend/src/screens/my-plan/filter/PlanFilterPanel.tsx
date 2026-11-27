import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePlanFilters, usePlanPanel } from '../PlanContext';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { PanelFadeIn } from '../../../ui/PanelFadeIn';
import { strings } from '../../../i18n/strings';
import { PlanFilterLevel } from './PlanFilterLevel';
import { MyScheduleShare } from '../../../features/social/MyScheduleShare';
import { SearchEntry } from '../../../features/search/SearchEntry';
import { SEARCH_ENTRY_DOCK_HEIGHT } from '../../../features/search/SearchDock.model';
import { FILTER_PANEL_PADDING, planFilterLevelModels, type PlanFilterLevelModel } from './PlanFilterLevel.model';
import { PanelSectionLabel } from '../../../ui/PanelSectionLabel';
import { overlayPanelColumn } from '../../../ui/overlayPanelColumn';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import {
  colors,
  OVERLAY_BACKDROP,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_RADIUS,
} from '../../../styling/tokens';

// ── My plan's filter panel ────────────────────────────────────────────────────
//
// Drops from under the TopBar like the lens panel, with the same backdrop and
// card, and the same place in AppShell; the search field at the bottom edge
// (features/search/SearchEntry). Under a "Filter" heading, one row per filter:
// its glyph and name, as the lens panel lists its sources, each drawn from its
// model (PlanFilterLevel.model.ts). A tap applies that filter and closes the
// panel, back to the list. Below them, the lens
// panel's "My schedule" section (MyScheduleShare), passed in as children.
// The content scrolls, as the lens panel's, when the card is shorter than it
// (a turned phone). Across the screen the card and the search field stand in
// the panels' column (ui/overlayPanelColumn.ts): on a turned phone the middle
// 70%, centred.


type ViewProps = {
  levels: PlanFilterLevelModel[];
  onPick: (level: PlanLevel) => void;
  onClose: () => void;
  /** Drawn outside the card, over the backdrop: the search field at the bottom edge. */
  dock?: React.ReactNode;
  /** Drawn below the filter rows. */
  children?: React.ReactNode;
};

export function PlanFilterPanelView({ levels, onPick, onClose, dock, children }: ViewProps) {
  const { isWide, width, height } = useLayoutMode();
  const column = useMemo(() => overlayPanelColumn({ isWide, width, height }), [isWide, width, height]);
  return (
    <PanelFadeIn>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={strings().planFilter.close}
        style={{ position: 'absolute', inset: 0, backgroundColor: OVERLAY_BACKDROP }}
      />
      {/* The frame ends above the search field; the card shrinks to fit it. */}
      <View
        testID="plan-filter-panel-frame"
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          bottom: SEARCH_ENTRY_DOCK_HEIGHT,
          left: column.left,
          right: column.right,
          width: column.width,
        }}
      >
        <View
          style={{
            flexShrink: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: OVERLAY_PANEL_RADIUS,
            padding: FILTER_PANEL_PADDING,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          {/* No `overflow: hidden` on the card: the ScrollView clips to its
              own frame, inset past the corner radius by the padding, and it
              would clip the shadow away on iOS (as in the lens panel). */}
          <ScrollView testID="plan-filter-panel-scroll" keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            <PanelSectionLabel>{strings().planFilter.heading}</PanelSectionLabel>
            {levels.map((item) => <PlanFilterLevel key={item.key} item={item} onPick={onPick} />)}
            {children}
          </ScrollView>
        </View>
      </View>
      {dock}
    </PanelFadeIn>
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
