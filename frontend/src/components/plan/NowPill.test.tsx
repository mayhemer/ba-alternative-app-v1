import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NowPillView } from './NowPill';

// ── The now pill in the top bar ───────────────────────────────────────────────
//
// One line saying what is happening for you right now: a live Must-see with its
// time left, the countdown to the next one, or — when there is nothing to say —
// the festival logo it stands in for.

const MIN = 60 * 1000;

it('shows a live set with its status and time left', async () => {
  await render(<NowPillView state={{ kind: 'live', artistName: 'Gojira', remainingMs: 37 * MIN, progress: 0.38, more: 0 }} onPress={jest.fn()} />);
  expect(screen.getByText('Gojira')).toBeTruthy();
  expect(screen.getByText('LIVE')).toBeTruthy();
  expect(screen.getByText('−37 min')).toBeTruthy();
  expect(screen.queryByText(/^\+\d/)).toBeNull();
});

it('counts the other Must-sees playing at the same time', async () => {
  await render(<NowPillView state={{ kind: 'live', artistName: 'Gojira', remainingMs: 8 * MIN, progress: 0.87, more: 1 }} onPress={jest.fn()} />);
  expect(screen.getByText('+1')).toBeTruthy();
});

it('shows the progress bar only while a set is live', async () => {
  const { rerender } = await render(
    <NowPillView state={{ kind: 'live', artistName: 'Gojira', remainingMs: 37 * MIN, progress: 0.38, more: 0 }} onPress={jest.fn()} />,
  );
  expect(screen.getByTestId('now-pill-progress')).toBeTruthy();

  await rerender(<NowPillView state={{ kind: 'break', artistName: 'Emperor', remainingMs: 80 * MIN }} onPress={jest.fn()} />);
  expect(screen.queryByTestId('now-pill-progress')).toBeNull();
});

it('counts down to the next Must-see during a break', async () => {
  await render(<NowPillView state={{ kind: 'break', artistName: 'Emperor', remainingMs: 80 * MIN }} onPress={jest.fn()} />);
  expect(screen.getByText('−1 h 20')).toBeTruthy();
  expect(screen.getByText('till')).toBeTruthy();
  expect(screen.getByText('Emperor')).toBeTruthy();
});

it('opens the plan when tapped', async () => {
  const onPress = jest.fn();
  await render(<NowPillView state={{ kind: 'break', artistName: 'Emperor', remainingMs: 80 * MIN }} onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('falls back to the logo, which does nothing on tap', async () => {
  await render(<NowPillView state={{ kind: 'logo' }} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Brutal Assault')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
