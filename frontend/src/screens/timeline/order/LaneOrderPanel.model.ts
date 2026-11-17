import { strings } from '../../../i18n/strings';
import { laneOrderRowModel, type LaneOrderRowModel } from './LaneOrderRow.model';
import type { DbCategory } from '../../../types/backend';

// ── The order panel: its heading and rows ─────────────────────────────────────
//
// The Program's lanes are stages, the Support Program's categories, and the
// heading says which. A row per lane, in the order handed in: the screen's
// (laneOrder.orderLanes), the order its timeline stacks them in.

export type LaneOrderPanelModel = {
  title: string;
  subtitle: string;
  rows: LaneOrderRowModel[];
};

export function laneOrderPanelModel({ support, categories }: { support: boolean; categories: readonly DbCategory[] }): LaneOrderPanelModel {
  const s = strings().laneOrder;
  return {
    title: support ? s.categoryTitle : s.stageTitle,
    subtitle: s.everyDay,
    rows: categories.map(laneOrderRowModel),
  };
}
