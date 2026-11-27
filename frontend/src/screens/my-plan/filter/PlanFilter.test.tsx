import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { PlanFilterChipView } from './PlanFilterChipView';
import { PlanFilterPanelView } from './PlanFilterPanel';
import { planFilterChipModel } from './PlanFilterChip.model';
import { planFilterLevelModels } from './PlanFilterLevel.model';
import type { PlanLevel } from '../../../store/uiStatePersistence';
import type { LayoutMode } from '../../../hooks/useLayoutMode';
import { setLanguageChoice } from '../../../i18n/language';

// ── The plan's filter chip and panel ──────────────────────────────────────────
//
// "State + menu", like the lens chip: the state slot tells which filter is on
// without opening anything; the panel lists the filters under a "Filter"
// heading, one row each: the chip's glyph and the filter's name, the current
// row raised and ticked. Both draw their models (PlanFilterChip.model.ts,
// PlanFilterLevel.model.ts, tested there). That a tap also closes the panel is
// the connected panel's job, tested with the screen (MyPlanScreen.test.tsx).
//
// The panel's dimensions: the filter (each of the four); the screen, upright
// or turned, which places its card (ui/overlayPanelColumn.ts, tested there):
// an upright phone unless a test turns it.

const UPRIGHT: LayoutMode = { isWide: false, isShort: false, contentPadding: 16, bottomClearance: 0, width: 402, height: 874 };
const mockLayout: { current: LayoutMode } = { current: UPRIGHT };
jest.mock('../../../hooks/useLayoutMode', () => ({ useLayoutMode: () => mockLayout.current }));
beforeEach(() => { mockLayout.current = UPRIGHT; });

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
    expect(selected('All my picks')).toBe(true);
    expect(selected('Only what I must see')).toBe(false);
    expect(selected('Only conflicts')).toBe(false);
  });

  it('picks the filter of the button tapped, the current one too', async () => {
    const { onPick } = await renderPanel('must');
    await fireEvent.press(screen.getByRole('button', { name: 'All sets' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Only conflicts' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Only what I must see' }));
    expect(onPick.mock.calls).toEqual([['all'], ['conflicts'], ['must']]);
  });

  it('heads the list "Filter" and names every filter beside its glyph', async () => {
    await renderPanel('must');
    expect(screen.getByText('Filter')).toBeTruthy();
    for (const name of ['All sets', 'All my picks', 'Only what I must see', 'Only conflicts']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    for (const icon of ['star-outline', 'star-half', 'star', 'warning-outline']) {
      expect(screen.getByTestId(`plan-filter-glyph-${icon}`)).toBeTruthy();
    }
  });

  it.each(['all', 'maybe', 'must', 'conflicts'] as const)('ticks only the current filter: %s', async (level) => {
    await renderPanel(level);
    expect(screen.getAllByTestId(/^plan-filter-tick-/).map((t) => t.props.testID)).toEqual([`plan-filter-tick-${level}`]);
  });

  it('names the filters in Czech', async () => {
    setLanguageChoice('cs');
    try {
      await renderPanel('must');
      expect(screen.getByText('Filtr')).toBeTruthy();
      expect(screen.getByText('Jen co musím vidět')).toBeTruthy();
    } finally {
      setLanguageChoice('system');
    }
  });

  it('closes on a tap outside the card', async () => {
    const { onClose } = await renderPanel();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('scrolls its content, the heading, the rows and the section below them', async () => {
    await render(
      <PlanFilterPanelView levels={planFilterLevelModels('must')} onPick={jest.fn()} onClose={jest.fn()}>
        <Text>Below the rows</Text>
      </PlanFilterPanelView>,
    );
    const scroller = screen.getByTestId('plan-filter-panel-scroll');
    expect(within(scroller).getByText('Filter')).toBeTruthy();
    expect(within(scroller).getByRole('button', { name: 'Only conflicts' })).toBeTruthy();
    expect(within(scroller).getByText('Below the rows')).toBeTruthy();
  });

  it('takes the middle 70% of a turned phone, centred', async () => {
    mockLayout.current = { ...mockLayout.current, width: 874, height: 402, isShort: true };
    await renderPanel();
    expect(screen.getByTestId('plan-filter-panel-frame')).toHaveStyle({ left: '15%', right: '15%', width: undefined });
  });

  it('spans an upright phone', async () => {
    await renderPanel();
    expect(screen.getByTestId('plan-filter-panel-frame')).toHaveStyle({ left: 10, right: 10, width: undefined });
  });
});
