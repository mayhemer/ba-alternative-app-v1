import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayButtons } from './DayButtons';
import { dayButtonModels } from './DayButton.model';

// ── The day buttons shared by the timeline and the plan ───────────────────────
//
// They draw their models (DayButton.model.ts, tested there) and report a tap.

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const THU = Date.parse('2025-08-07T06:00:00+02:00');
const FRI = Date.parse('2025-08-08T06:00:00+02:00');
const DAYS = [WED, THU, FRI];

it('lists the days and picks one on tap', async () => {
  const onPick = jest.fn();
  await render(<DayButtons buttons={dayButtonModels(DAYS, { selected: WED, today: null })} onPick={onPick} />);
  expect(screen.getByText('Wed')).toBeTruthy();
  expect(screen.getByText('6.8.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Thu'));
  expect(onPick).toHaveBeenCalledWith(THU);
});

it('selects the selected day', async () => {
  await render(<DayButtons buttons={dayButtonModels(DAYS, { selected: THU, today: null })} onPick={jest.fn()} />);
  expect(screen.getByTestId(`day-${THU}`).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByTestId(`day-${WED}`).props.accessibilityState).toMatchObject({ selected: false });
});

it('marks today', async () => {
  await render(<DayButtons buttons={dayButtonModels(DAYS, { selected: WED, today: THU })} onPick={jest.fn()} />);
  expect(screen.getByTestId(`day-today-${THU}`)).toBeTruthy();
  expect(screen.queryByTestId(`day-today-${WED}`)).toBeNull();
});

it('stripes only the clash days', async () => {
  const { rerender } = await render(<DayButtons buttons={dayButtonModels(DAYS, { selected: WED, today: null })} onPick={jest.fn()} />);
  expect(screen.queryByTestId(`day-clash-${THU}`)).toBeNull();

  await rerender(<DayButtons buttons={dayButtonModels(DAYS, { selected: WED, today: null, clashDays: new Set([THU]) })} onPick={jest.fn()} />);
  expect(screen.getByTestId(`day-clash-${THU}`)).toBeTruthy();
  expect(screen.queryByTestId(`day-clash-${FRI}`)).toBeNull();
});
