import { planFilterChipModel } from './PlanFilterChip.model';
import { colors } from '../../../styling/tokens';

// ── My plan's filter chip, as a model ─────────────────────────────────────────
//
// Dimensions: the filter (All sets, Must-see and Maybe, Must-see only, Only
// conflicts); the panel closed / open. Each filter shows its own glyph, the
// same as its button in the panel.

describe('planFilterChipModel', () => {
  it('shows the accent full star for Must-see only', () => {
    expect(planFilterChipModel({ level: 'must', isOpen: false })).toEqual({
      key: 'plan-filter-chip',
      state: { testID: 'plan-filter-state-must', icon: 'star', color: colors.accent },
      dotsColor: colors.textPrimary,
      expanded: false,
    });
  });

  it('shows the accent half star for Must-see and Maybe', () => {
    expect(planFilterChipModel({ level: 'maybe', isOpen: false }).state).toEqual({
      testID: 'plan-filter-state-maybe', icon: 'star-half', color: colors.accent,
    });
  });

  it('shows the grey outline star for All sets', () => {
    expect(planFilterChipModel({ level: 'all', isOpen: false }).state).toEqual({
      testID: 'plan-filter-state-all', icon: 'star-outline', color: colors.muted,
    });
  });

  it('shows the red warning sign for Only conflicts', () => {
    expect(planFilterChipModel({ level: 'conflicts', isOpen: false }).state).toEqual({
      testID: 'plan-filter-state-conflicts', icon: 'warning-outline', color: colors.danger,
    });
  });

  it('is drawn open while the panel is open: the glyph and the dots black', () => {
    expect(planFilterChipModel({ level: 'must', isOpen: true })).toEqual({
      key: 'plan-filter-chip',
      state: { testID: 'plan-filter-state-must', icon: 'star', color: colors.black },
      dotsColor: colors.black,
      expanded: true,
    });
    expect(planFilterChipModel({ level: 'conflicts', isOpen: true }).state).toEqual({
      testID: 'plan-filter-state-conflicts', icon: 'warning-outline', color: colors.black,
    });
  });
});
