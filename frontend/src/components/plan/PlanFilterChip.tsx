import React, { useMemo } from 'react';
import { usePlanFilters, usePlanPanel } from '../../context/PlanContext';
import { planFilterChipModel } from './PlanFilterChip.model';
import { PlanFilterChipView } from './PlanFilterChipView';

// ── My plan's filter chip (TopBar right slot) ─────────────────────────────────
//
// Reads the filters and the panel's state, and hands them to the chip's model;
// the chip itself is PlanFilterChipView. A tap opens or closes the panel.

export function PlanFilterChip() {
  const { showMaybe, conflictsOnly } = usePlanFilters();
  const { isOpen, toggle } = usePlanPanel();
  const item = useMemo(() => planFilterChipModel({ showMaybe, conflictsOnly, isOpen }), [showMaybe, conflictsOnly, isOpen]);
  return <PlanFilterChipView item={item} onPress={toggle} />;
}
