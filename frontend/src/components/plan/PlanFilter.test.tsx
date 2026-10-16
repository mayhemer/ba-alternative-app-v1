import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanFilterChipView } from './PlanFilterChip';
import { PlanFilterPanelView } from './PlanFilterPanel';

// ── The plan's filter chip and panel ──────────────────────────────────────────
//
// "State + menu", like the lens chip: the state slot tells which filter is on
// without opening anything, the panel holds the two switches.

describe('PlanFilterChipView', () => {
  it('shows the half star, filled while Maybe picks are shown', async () => {
    const { rerender } = await render(<PlanFilterChipView showMaybe={false} conflictsOnly={false} isOpen={false} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-maybe-off')).toBeTruthy();

    await rerender(<PlanFilterChipView showMaybe={true} conflictsOnly={false} isOpen={false} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-maybe-on')).toBeTruthy();
  });

  it('shows the warning sign while only conflicts are shown', async () => {
    await render(<PlanFilterChipView showMaybe={true} conflictsOnly={true} isOpen={false} onPress={jest.fn()} />);
    expect(screen.getByTestId('plan-filter-state-conflicts')).toBeTruthy();
    expect(screen.queryByTestId('plan-filter-state-maybe-on')).toBeNull();
  });

  it('opens the panel', async () => {
    const onPress = jest.fn();
    await render(<PlanFilterChipView showMaybe={false} conflictsOnly={false} isOpen={false} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Filters'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PlanFilterPanelView', () => {
  async function renderPanel(props: Partial<React.ComponentProps<typeof PlanFilterPanelView>> = {}) {
    const handlers = { onToggleMaybe: jest.fn(), onToggleConflicts: jest.fn(), onClose: jest.fn() };
    await render(<PlanFilterPanelView showMaybe={false} conflictsOnly={false} {...handlers} {...props} />);
    return handlers;
  }

  it('has the two switches, reflecting their state', async () => {
    await renderPanel({ showMaybe: true });
    expect(screen.getByRole('switch', { name: 'Show Maybe picks' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('switch', { name: 'Show only conflicts' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('toggles each filter', async () => {
    const { onToggleMaybe, onToggleConflicts } = await renderPanel();
    await fireEvent.press(screen.getByRole('switch', { name: 'Show Maybe picks' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Show only conflicts' }));
    expect(onToggleMaybe).toHaveBeenCalledTimes(1);
    expect(onToggleConflicts).toHaveBeenCalledTimes(1);
  });

  it('disables the Maybe switch while only conflicts are shown', async () => {
    const { onToggleMaybe } = await renderPanel({ conflictsOnly: true });
    const maybe = screen.getByRole('switch', { name: 'Show Maybe picks' });
    expect(maybe.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(maybe);
    expect(onToggleMaybe).not.toHaveBeenCalled();
  });

  it('closes on a tap outside the card', async () => {
    const { onClose } = await renderPanel();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
