import { planFilterChipModel } from './PlanFilterChip.model';
import { colors } from '../../../styling/tokens';

// ── My plan's filter chip, as a model ─────────────────────────────────────────
//
// Dimensions: Show Maybe off / on; Show only conflicts off / on; the panel
// closed / open. "Show only conflicts" overrides the Maybe state, so it is
// tested with Maybes on, where it changes what the slot shows.

describe('planFilterChipModel', () => {
  it('shows the grey outline star while Maybe picks are hidden', () => {
    expect(planFilterChipModel({ showMaybe: false, conflictsOnly: false, isOpen: false })).toEqual({
      key: 'plan-filter-chip',
      state: { testID: 'plan-filter-state-maybe-off', icon: 'star-outline', color: colors.muted },
      dotsColor: colors.textPrimary,
      expanded: false,
    });
  });

  it('shows the accent half star while Maybe picks are shown', () => {
    expect(planFilterChipModel({ showMaybe: true, conflictsOnly: false, isOpen: false }).state).toEqual({
      testID: 'plan-filter-state-maybe-on', icon: 'star-half', color: colors.accent,
    });
  });

  it('shows the red warning sign while only conflicts are shown, whatever the Maybe switch says', () => {
    expect(planFilterChipModel({ showMaybe: true, conflictsOnly: true, isOpen: false }).state).toEqual({
      testID: 'plan-filter-state-conflicts', icon: 'warning-outline', color: colors.danger,
    });
  });

  it('turns the dots accent while the panel is open', () => {
    const open = planFilterChipModel({ showMaybe: false, conflictsOnly: false, isOpen: true });
    expect(open.dotsColor).toBe(colors.accent);
    expect(open.expanded).toBe(true);
  });
});
