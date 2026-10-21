import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NowPillView } from './NowPill';
import type { NowPillModel } from './NowPill.model';

// ── The now pill in the top bar ───────────────────────────────────────────────
//
// One line saying what is happening for you right now: a live Must-see with its
// time left, the countdown to the next one, or — when there is nothing to say —
// the festival logo it stands in for.

const GOJIRA_LIVE: NowPillModel = { kind: 'live', artistName: 'Gojira', label: 'LIVE', time: '−37 min', progress: 0.38, more: 0, accessibilityLabel: 'Gojira LIVE −37 min' };
const GOJIRA_ENDING: NowPillModel = { kind: 'live', artistName: 'Gojira', label: 'LIVE', time: '−8 min', progress: 0.87, more: 1, accessibilityLabel: 'Gojira LIVE −8 min' };
const TILL_EMPEROR: NowPillModel = { kind: 'break', artistName: 'Emperor', time: '−1 h 20', till: 'till', accessibilityLabel: '−1 h 20 till Emperor' };

it('shows a live set with its status and time left', async () => {
  await render(<NowPillView state={GOJIRA_LIVE} onPress={jest.fn()} />);
  expect(screen.getByText('Gojira')).toBeTruthy();
  expect(screen.getByText('LIVE')).toBeTruthy();
  expect(screen.getByText('−37 min')).toBeTruthy();
  expect(screen.queryByText(/^\+\d/)).toBeNull();
});

it('counts the other Must-sees playing at the same time', async () => {
  await render(<NowPillView state={GOJIRA_ENDING} onPress={jest.fn()} />);
  expect(screen.getByText('+1')).toBeTruthy();
});

it('shows the progress bar only while a set is live', async () => {
  const { rerender } = await render(
    <NowPillView state={GOJIRA_LIVE} onPress={jest.fn()} />,
  );
  expect(screen.getByTestId('now-pill-progress')).toBeTruthy();

  await rerender(<NowPillView state={TILL_EMPEROR} onPress={jest.fn()} />);
  expect(screen.queryByTestId('now-pill-progress')).toBeNull();
});

it('counts down to the next Must-see during a break', async () => {
  await render(<NowPillView state={TILL_EMPEROR} onPress={jest.fn()} />);
  expect(screen.getByText('−1 h 20')).toBeTruthy();
  expect(screen.getByText('till')).toBeTruthy();
  expect(screen.getByText('Emperor')).toBeTruthy();
});

it('opens the plan when tapped', async () => {
  const onPress = jest.fn();
  await render(<NowPillView state={TILL_EMPEROR} onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('falls back to the logo, which does nothing on tap', async () => {
  await render(<NowPillView state={{ kind: 'logo' }} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Brutal Assault')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
