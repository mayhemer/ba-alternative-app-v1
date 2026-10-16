import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayButtons } from './DayButtons';
import { getFestivalDayStart } from './timelineLayout';

// ── The day buttons shared by the timeline and the plan ───────────────────────

const day = (d: number): number => getFestivalDayStart(Date.parse(`2025-08-0${d}T12:00:00+02:00`));
const WED = day(6);
const THU = day(7);
const FRI = day(8);

it('lists the days and picks one on tap', async () => {
  const onPick = jest.fn();
  await render(<DayButtons days={[WED, THU, FRI]} selected={WED} today={null} onPick={onPick} />);
  expect(screen.getByText('Wed')).toBeTruthy();
  await fireEvent.press(screen.getByText('Thu'));
  expect(onPick).toHaveBeenCalledWith(THU);
});

it('marks today', async () => {
  await render(<DayButtons days={[WED, THU, FRI]} selected={WED} today={THU} onPick={jest.fn()} />);
  expect(screen.getByTestId(`day-today-${THU}`)).toBeTruthy();
  expect(screen.queryByTestId(`day-today-${WED}`)).toBeNull();
});

it('stripes only the days it is told to mark', async () => {
  const { rerender } = await render(<DayButtons days={[WED, THU, FRI]} selected={WED} today={null} onPick={jest.fn()} />);
  expect(screen.queryByTestId(`day-clash-${THU}`)).toBeNull();

  await rerender(<DayButtons days={[WED, THU, FRI]} selected={WED} today={null} onPick={jest.fn()} marked={new Set([THU])} />);
  expect(screen.getByTestId(`day-clash-${THU}`)).toBeTruthy();
  expect(screen.queryByTestId(`day-clash-${FRI}`)).toBeNull();
});
