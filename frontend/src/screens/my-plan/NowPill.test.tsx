import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NowPillView } from './NowPill';
import type { NowPillModel } from './NowPill.model';
import { colors } from '../../styling/tokens';

// The logo image, swapped for a stand-in that counts how often it is drawn.
const mockLogoRenders = jest.fn();
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ accessibilityLabel }: { accessibilityLabel?: string }) => {
      mockLogoRenders();
      return <View accessibilityLabel={accessibilityLabel} />;
    },
  };
});

// ── The now pill in the top bar ───────────────────────────────────────────────
//
// One line saying what is happening for you right now: a live Must-see with its
// time left, the countdown to the next one, or — when there is nothing to say —
// the festival logo it stands in for. No words: a red dot marks a live set.

const GOJIRA_LIVE: NowPillModel = { kind: 'live', artistName: 'Gojira', time: '−37\u202Fmin', progress: 0.38, more: 0, accessibilityLabel: 'Gojira LIVE −37\u202Fmin' };
const GOJIRA_ENDING: NowPillModel = { kind: 'live', artistName: 'Gojira', time: '−8\u202Fmin', progress: 0.87, more: 1, accessibilityLabel: 'Gojira LIVE −8\u202Fmin' };
const START_EMPEROR: NowPillModel = { kind: 'break', artistName: 'Emperor', time: '−1\u202Fh\u202F20', accessibilityLabel: 'Emperor START −1\u202Fh\u202F20' };

it('shows a live set with its time left, and no status word', async () => {
  await render(<NowPillView state={GOJIRA_LIVE} onPress={jest.fn()} />);
  expect(screen.getByText('Gojira')).toBeTruthy();
  expect(screen.getByText('−37\u202Fmin')).toBeTruthy();
  expect(screen.queryByText('LIVE')).toBeNull();
  expect(screen.queryByTestId('now-pill-clash')).toBeNull();
});

it('marks other Must-sees playing at the same time with the warning glyph, not a count', async () => {
  await render(<NowPillView state={GOJIRA_ENDING} onPress={jest.fn()} />);
  expect(screen.getByTestId('now-pill-clash')).toBeTruthy();
  expect(screen.queryByText(/^\+\d/)).toBeNull();
});

it('shows the progress bar only while a set is live', async () => {
  const { rerender } = await render(
    <NowPillView state={GOJIRA_LIVE} onPress={jest.fn()} />,
  );
  expect(screen.getByTestId('now-pill-progress')).toBeTruthy();

  await rerender(<NowPillView state={START_EMPEROR} onPress={jest.fn()} />);
  expect(screen.queryByTestId('now-pill-progress')).toBeNull();
});

it('fills the live bar dark for the time passed, over the accent for what remains', async () => {
  await render(<NowPillView state={GOJIRA_LIVE} onPress={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByTestId('now-pill-progress').props.style).backgroundColor).toBe(colors.accent);
  expect(StyleSheet.flatten(screen.getByTestId('now-pill-fill').props.style).backgroundColor).toBe(colors.livePassed);
});

it('counts down to the next Must-see during a break', async () => {
  await render(<NowPillView state={START_EMPEROR} onPress={jest.fn()} />);
  expect(screen.getByText('Emperor')).toBeTruthy();
  expect(screen.getByText('−1\u202Fh\u202F20')).toBeTruthy();
  expect(screen.queryByText('START')).toBeNull();
});

it('steps its background up while pressed, as a button does, live or in a break', async () => {
  for (const state of [GOJIRA_LIVE, START_EMPEROR]) {
    await render(<NowPillView state={state} onPress={jest.fn()} />);
    const background = (): unknown => StyleSheet.flatten(screen.getByTestId('now-pill').props.style).backgroundColor;
    expect(background()).toBe(colors.surfaceRaised);
    await fireEvent(screen.getByTestId('now-pill'), 'pressIn');
    expect(background()).toBe('#262626');
    await fireEvent(screen.getByTestId('now-pill'), 'pressOut');
    expect(background()).toBe(colors.surfaceRaised);
  }
});

it('reacts to a tap', async () => {
  const onPress = jest.fn();
  await render(<NowPillView state={START_EMPEROR} onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('is not drawn again for the same model and handler, as the logo is minute after minute', async () => {
  const onPress = jest.fn();
  const logo: NowPillModel = { kind: 'logo' };
  const { rerender } = await render(<NowPillView state={logo} onPress={onPress} />);
  mockLogoRenders.mockClear();
  await rerender(<NowPillView state={logo} onPress={onPress} />);
  expect(mockLogoRenders).not.toHaveBeenCalled();
});

it('falls back to the logo, which does nothing on tap', async () => {
  await render(<NowPillView state={{ kind: 'logo' }} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Brutal Assault')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
