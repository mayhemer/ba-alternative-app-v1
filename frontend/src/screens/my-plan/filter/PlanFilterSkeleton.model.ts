import { colors } from '../../../styling/tokens';
import { panelSkeletonBorder } from '../../../ui/PanelSkeletonCard.model';
import { filterGlyph, type IconName } from './PlanFilterChip.model';
import { FILTER_PANEL_PADDING, LEVEL_BUTTON_HEIGHT, PLAN_LEVEL_ORDER } from './PlanFilterLevel.model';

// ── The filter panel's preview, pulled down from the top of My plan ───────────
//
// An outline of the panel's card down to its row of four buttons, each with its
// filter's glyph, in the panel's order and measures (PlanFilterLevel.model).
// Grey while pulled; once it is all out (armed: letting go opens the panel)
// each glyph takes its own colour, as on the panel, and the card reacts as
// panelSkeletonBorder says. Drawn by PlanFilterSkeleton, brought down by
// ui/PullPreview.

export type PlanFilterSkeletonModel = {
  glyphs: { icon: IconName; color: string }[];
  borderColor: string;
  /** The card, its 1 pt border included. With the card's 10 pt under the top bar, as far as a pull arms (ui/PullPreview.model). */
  cardHeight: number;
};

const BORDER = 1;
const CARD_HEIGHT = 2 * BORDER + 2 * FILTER_PANEL_PADDING + LEVEL_BUTTON_HEIGHT;

function model(armed: boolean): PlanFilterSkeletonModel {
  return {
    glyphs: PLAN_LEVEL_ORDER.map((level) => {
      const glyph = filterGlyph(level);
      return { icon: glyph.icon, color: armed ? glyph.color : colors.muted };
    }),
    borderColor: panelSkeletonBorder(armed, colors.borderMid),
    cardHeight: CARD_HEIGHT,
  };
}

const IDLE = model(false);
const ARMED = model(true);

export function planFilterSkeletonModel(armed: boolean): PlanFilterSkeletonModel {
  return armed ? ARMED : IDLE;
}
