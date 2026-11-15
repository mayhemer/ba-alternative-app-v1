import { planFilterSkeletonModel } from './PlanFilterSkeleton.model';
import { colors } from '../../../styling/tokens';

// ── The filter panel's preview, pulled down from the top of My plan ───────────
//
// An outline of the panel's card and its four buttons with their glyphs, in the
// panel's order, grey; once it is all out (armed) the glyphs take their own
// colours, as on the panel. The card's border stays grey, armed too.
//
// Dimension: armed or not.

it('outlines the four buttons with the panel\'s glyphs, in its order, grey', () => {
  expect(planFilterSkeletonModel(false).glyphs).toEqual([
    { icon: 'star-outline', color: colors.muted },
    { icon: 'star-half', color: colors.muted },
    { icon: 'star', color: colors.muted },
    { icon: 'warning-outline', color: colors.muted },
  ]);
  expect(planFilterSkeletonModel(false).borderColor).toBe(colors.borderMid);
});

it('armed, draws each glyph in its own colour, the card\'s border still grey', () => {
  expect(planFilterSkeletonModel(true).glyphs).toEqual([
    { icon: 'star-outline', color: colors.muted },
    { icon: 'star-half', color: colors.accent },
    { icon: 'star', color: colors.accent },
    { icon: 'warning-outline', color: colors.danger },
  ]);
  expect(planFilterSkeletonModel(true).borderColor).toBe(colors.borderMid);
});

// The panel's own measures: a 48 pt button row in 12 pt padding and a 1 pt
// border.
it('is as tall as the panel\'s card down to its buttons: 74 pt', () => {
  expect(planFilterSkeletonModel(false).cardHeight).toBe(74);
  expect(planFilterSkeletonModel(true).cardHeight).toBe(74);
});
