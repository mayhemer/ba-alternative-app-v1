import { strings } from '../../../i18n/strings';
import { categoryBlockColors, decodeCategoryColor } from '../../../utils/color';
import { getCategoryLocalized } from '../../../utils/localization';
import type { DbCategory } from '../../../types/backend';

// ── A row of the order list: what it shows ────────────────────────────────────
//
// The lane's name, a swatch filled and edged in the colours the lane's blocks
// are (utils/color categoryBlockColors), and its handle's spoken label.

export type LaneOrderRowModel = {
  /** The categoryId. */
  key: string;
  name: string;
  swatchFill: string;
  swatchEdge: string;
  /** The handle's label: "Move Marshall". */
  moveLabel: string;
};

export function laneOrderRowModel(category: DbCategory): LaneOrderRowModel {
  const name = getCategoryLocalized(category.localized, 'title');
  const { bg, border } = categoryBlockColors(decodeCategoryColor(category.color));
  return {
    key: category.categoryId,
    name,
    swatchFill: bg,
    swatchEdge: border,
    moveLabel: strings().laneOrder.move(name),
  };
}
