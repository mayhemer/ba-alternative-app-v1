import { planFilterSwitchModels } from './PlanFilterSwitch.model';
import { colors } from '../../../styling/tokens';

// ── The filter panel's switches, as models ────────────────────────────────────
//
// Dimensions: Show Maybe off / on; Show only conflicts off / on. "Show only
// conflicts" makes the Maybe switch moot, so it disables it, and the Maybe
// switch still says where it stands meanwhile.

describe('planFilterSwitchModels', () => {
  it('has the Maybe switch, then the conflicts switch, both off by default', () => {
    expect(planFilterSwitchModels({ showMaybe: false, conflictsOnly: false })).toEqual([
      { key: 'switch-maybe', filter: 'showMaybe', label: 'Show Maybe picks', icon: 'star-half', color: colors.accent, on: false, disabled: false },
      { key: 'switch-conflicts', filter: 'conflictsOnly', label: 'Show only conflicts', icon: 'warning-outline', color: colors.danger, on: false, disabled: false },
    ]);
  });

  it('turns on the Maybe switch alone while Maybe picks are shown', () => {
    expect(planFilterSwitchModels({ showMaybe: true, conflictsOnly: false }).map((s) => [s.key, s.on, s.disabled])).toEqual([
      ['switch-maybe', true, false],
      ['switch-conflicts', false, false],
    ]);
  });

  it('disables the Maybe switch while only conflicts are shown, keeping its own state', () => {
    expect(planFilterSwitchModels({ showMaybe: true, conflictsOnly: true }).map((s) => [s.key, s.on, s.disabled])).toEqual([
      ['switch-maybe', true, true],
      ['switch-conflicts', true, false],
    ]);
  });
});
