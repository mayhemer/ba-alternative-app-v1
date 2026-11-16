import { planFilterSkeletonModel } from './PlanFilterSkeleton.model';
import { colors } from '../../../styling/tokens';

// ── The filter panel's preview, pulled down from the top of My plan ───────────
//
// The panel's card with its heading and four rows, drawn by the panel's own
// row element: glyphs and names grey, none current; once it is all out (armed)
// the glyphs take their own colours, as on the panel. The card's border stays
// grey, armed too. It fits its content, as the lens panel's preview does: the
// pull arms at a fixed distance (ui/PullPreview.model), whatever its height.
//
// Dimension: armed or not.

const LABELS = ['All sets', 'All my picks', 'Only what I must see', 'Only conflicts'];

it('outlines the panel\'s rows, in its order: each glyph and name grey, none current', () => {
  const rows = planFilterSkeletonModel(false).levels;
  expect(rows.map((r) => ({ icon: r.icon, color: r.color, label: r.label, selected: r.selected }))).toEqual([
    { icon: 'star-outline', color: colors.muted, label: LABELS[0], selected: false },
    { icon: 'star-half', color: colors.muted, label: LABELS[1], selected: false },
    { icon: 'star', color: colors.muted, label: LABELS[2], selected: false },
    { icon: 'warning-outline', color: colors.muted, label: LABELS[3], selected: false },
  ]);
  expect(planFilterSkeletonModel(false).textColor).toBe(colors.muted);
  expect(planFilterSkeletonModel(false).borderColor).toBe(colors.borderMid);
});

it('armed, draws each glyph in its own colour, the names and the card\'s border still grey', () => {
  expect(planFilterSkeletonModel(true).levels.map((r) => ({ icon: r.icon, color: r.color }))).toEqual([
    { icon: 'star-outline', color: colors.muted },
    { icon: 'star-half', color: colors.accent },
    { icon: 'star', color: colors.accent },
    { icon: 'warning-outline', color: colors.danger },
  ]);
  expect(planFilterSkeletonModel(true).textColor).toBe(colors.muted);
  expect(planFilterSkeletonModel(true).borderColor).toBe(colors.borderMid);
});
