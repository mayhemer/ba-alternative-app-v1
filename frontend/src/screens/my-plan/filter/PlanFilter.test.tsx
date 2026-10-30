import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanFilterChipView } from './PlanFilterChipView';
import { PlanFilterPanelView } from './PlanFilterPanel';
import { planFilterChipModel } from './PlanFilterChip.model';
import { planFilterLevelModels } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';

// ── The plan's filter chip and panel ──────────────────────────────────────────
//
// "State + menu", like the lens chip: the state slot tells which filter is on
// without opening anything; the panel holds one button per filter, glyphs
// only. Both draw their models (PlanFilterChip.model.ts,
// PlanFilterLevel.model.ts, tested there). That a tap also closes the panel is
// the connected panel's job, tested with the screen (MyPlanScreen.test.tsx).

describe('PlanFilterChipView', () => {
  it.each([
    ['all', 'plan-filter-state-all'],
    ['maybe', 'plan-filter-state-maybe'],
    ['must', 'plan-filter-state-must'],
    ['conflicts', 'plan-filter-state-conflicts'],
  ] as const)('shows the %s filter\'s glyph', async (level, testID) => {
    await render(<PlanFilterChipView item={planFilterChipModel({ level, isOpen: false })} onPress={jest.fn()} />);
    expect(screen.getByTestId(testID)).toBeTruthy();
  });

  it('says whether the panel is open', async () => {
    await render(<PlanFilterChipView item={planFilterChipModel({ level: 'must', isOpen: true })} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Filters').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('opens the panel', async () => {
    const onPress = jest.fn();
    await render(<PlanFilterChipView item={planFilterChipModel({ level: 'must', isOpen: false })} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Filters'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PlanFilterPanelView', () => {
  async function renderPanel(level: PlanLevel = 'must') {
    const handlers = { onPick: jest.fn(), onClose: jest.fn() };
    await render(<PlanFilterPanelView levels={planFilterLevelModels(level)} {...handlers} />);
    return handlers;
  }

  it('has a button per filter, named for screen readers, the current one selected', async () => {
    await renderPanel('maybe');
    const selected = (name: string): unknown => screen.getByRole('button', { name }).props.accessibilityState?.selected;
    expect(selected('All sets')).toBe(false);
    expect(selected('Must-see and Maybe')).toBe(true);
    expect(selected('Must-see only')).toBe(false);
    expect(selected('Only conflicts')).toBe(false);
  });

  it('picks the filter of the button tapped, the current one too', async () => {
    const { onPick } = await renderPanel('must');
    await fireEvent.press(screen.getByRole('button', { name: 'All sets' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Only conflicts' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Must-see only' }));
    expect(onPick.mock.calls).toEqual([['all'], ['conflicts'], ['must']]);
  });

  it('closes on a tap outside the card', async () => {
    const { onClose } = await renderPanel();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
