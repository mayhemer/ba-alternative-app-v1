import { planFilterLevelModels } from './PlanFilterLevel.model';
import { colors } from '../../../styling/tokens';

// ── The filter panel's buttons, as models ─────────────────────────────────────
//
// One button per filter, in a fixed order, each with the chip's glyph for that
// filter and a label for screen readers. Dimension: the current filter (each of
// the four), which decides the one button shown as selected.

describe('planFilterLevelModels', () => {
  it('has the four filters in order, with their glyphs and labels, the current one selected', () => {
    expect(planFilterLevelModels('must')).toEqual([
      { key: 'level-all', level: 'all', label: 'All sets', icon: 'star-outline', color: colors.muted, selected: false },
      { key: 'level-maybe', level: 'maybe', label: 'Must-see and Maybe', icon: 'star-half', color: colors.accent, selected: false },
      { key: 'level-must', level: 'must', label: 'Must-see only', icon: 'star', color: colors.accent, selected: true },
      { key: 'level-conflicts', level: 'conflicts', label: 'Only conflicts', icon: 'warning-outline', color: colors.danger, selected: false },
    ]);
  });

  it.each([
    ['all', ['level-all']],
    ['maybe', ['level-maybe']],
    ['must', ['level-must']],
    ['conflicts', ['level-conflicts']],
  ] as const)('selects only the current filter: %s', (level, expected) => {
    expect(planFilterLevelModels(level).filter((b) => b.selected).map((b) => b.key)).toEqual(expected);
  });
});
