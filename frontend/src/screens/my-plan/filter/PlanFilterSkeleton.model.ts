import { colors } from '../../../styling/tokens';
import { panelSkeletonBorder } from '../../../ui/PanelSkeletonCard.model';
import { planFilterLevelModels, type PlanFilterLevelModel } from './PlanFilterLevel.model';

// ── The filter panel's preview, pulled down from the top of My plan ───────────
//
// The panel's card with its heading and its four rows, in the panel's order,
// drawn by the panel's own row element (PlanFilterLevel): glyphs and names
// grey, none current. Once it is all out (armed: letting go opens the panel)
// each glyph takes its own colour, as on the panel, and the card reacts as
// panelSkeletonBorder says. It fits its content, as the lens panel's preview
// does: a pull arms at a fixed distance (ui/PullPreview.model), and a longer
// pull uncovers more of it. Drawn by PlanFilterSkeleton, brought down by
// ui/PullPreview.

export type PlanFilterSkeletonModel = {
  levels: PlanFilterLevelModel[];
  /** The heading and the names. */
  textColor: string;
  borderColor: string;
};

const GREY = colors.muted;

function model(armed: boolean): PlanFilterSkeletonModel {
  return {
    // Built for no current filter: the preview marks none.
    levels: planFilterLevelModels(null).map((level) => ({ ...level, color: armed ? level.color : GREY })),
    textColor: GREY,
    borderColor: panelSkeletonBorder(armed, colors.borderMid),
  };
}

/** Built at the pull, so the names follow the app's language. */
export function planFilterSkeletonModel(armed: boolean): PlanFilterSkeletonModel {
  return model(armed);
}
