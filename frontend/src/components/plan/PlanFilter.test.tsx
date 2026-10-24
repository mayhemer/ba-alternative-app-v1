import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanFilterChipView } from './PlanFilterChipView';
import { PlanFilterPanelView } from './PlanFilterPanel';
import { planFilterChipModel } from './PlanFilterChip.model';
import { planFilterSwitchModels } from './PlanFilterSwitch.model';

// ── The plan's filter chip and panel ──────────────────────────────────────────
//
// "State + menu", like the lens chip: the state slot tells which filter is on
// without opening anything, the panel holds the two switches. Both draw their
// models (PlanFilterChip.model.ts, PlanFilterSwitch.model.ts, tested there).

describe('PlanFilterChipView', () => {
  it('shows the half star, filled while Maybe picks are shown', async () => {
    const { rerender } = await render(<PlanFilterChipView item={planFilterChipModel({ showMaybe: false, conflictsOnly: false, isOpen: false })} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-maybe-off')).toBeTruthy();

    await rerender(<PlanFilterChipView item={planFilterChipModel({ showMaybe: true, conflictsOnly: false, isOpen: false })} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-maybe-on')).toBeTruthy();
  });

  it('shows the warning sign while only conflicts are shown', async () => {
    await render(<PlanFilterChipView item={planFilterChipModel({ showMaybe: true, conflictsOnly: true, isOpen: false })} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-conflicts')).toBeTruthy();
    expect(screen.queryByTestId('plan-filter-state-maybe-on')).toBeNull();
  });

  it('says whether the panel is open', async () => {
    await render(<PlanFilterChipView item={planFilterChipModel({ showMaybe: false, conflictsOnly: false, isOpen: true })} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Filters').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('opens the panel', async () => {
    const onPress = jest.fn();
    await render(<PlanFilterChipView item={planFilterChipModel({ showMaybe: false, conflictsOnly: false, isOpen: false })} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Filters'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PlanFilterPanelView', () => {
  async function renderPanel(filters: { showMaybe: boolean; conflictsOnly: boolean } = { showMaybe: false, conflictsOnly: false }) {
    const handlers = { onToggle: jest.fn(), onClose: jest.fn() };
    await render(<PlanFilterPanelView switches={planFilterSwitchModels(filters)} {...handlers} />);
    return handlers;
  }

  it('has the two switches, reflecting their state', async () => {
    await renderPanel({ showMaybe: true, conflictsOnly: false });
    expect(screen.getByRole('switch', { name: 'Show Maybe picks' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('switch', { name: 'Show only conflicts' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('toggles each filter', async () => {
    const { onToggle } = await renderPanel();
    await fireEvent.press(screen.getByRole('switch', { name: 'Show Maybe picks' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Show only conflicts' }));
    expect(onToggle.mock.calls).toEqual([['showMaybe'], ['conflictsOnly']]);
  });

  it('disables the Maybe switch while only conflicts are shown', async () => {
    const { onToggle } = await renderPanel({ showMaybe: false, conflictsOnly: true });
    const maybe = screen.getByRole('switch', { name: 'Show Maybe picks' });
    expect(maybe.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(maybe);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('closes on a tap outside the card', async () => {
    const { onClose } = await renderPanel();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
