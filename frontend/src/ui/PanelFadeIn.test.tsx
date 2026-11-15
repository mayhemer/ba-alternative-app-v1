import React from 'react';
import { ReduceMotion } from 'react-native-reanimated';
import { render, screen, within } from '@testing-library/react-native';
import { Text } from './Text';
import { PANEL_FADE_IN, PanelFadeIn } from './PanelFadeIn';
import { OVERLAY_PANEL_FADE_IN_MS } from '../styling/tokens';

// ── A drop-down panel fading in ───────────────────────────────────────────────
//
// The lens and filter panels appear over 250 ms, their backdrop, card and
// search field together; they close at once. While fading they take touches.
// The fade plays with the system's reduce-motion setting on too: it moves
// nothing, and iOS itself fades in place of motion there.

it('fades its panel in over 250 ms', async () => {
  await render(<PanelFadeIn><Text>Panel</Text></PanelFadeIn>);
  const fade = screen.getByTestId('panel-fade-in');
  expect(OVERLAY_PANEL_FADE_IN_MS).toBe(250);
  expect(fade.props.entering).toBe(PANEL_FADE_IN);
  expect(within(fade).getByText('Panel')).toBeTruthy();
});

it('fades in with reduce motion on too', () => {
  expect(PANEL_FADE_IN.getReduceMotion()).toBe(ReduceMotion.Never);
});

it('leaves touches to the panel in it', async () => {
  await render(<PanelFadeIn><Text>Panel</Text></PanelFadeIn>);
  expect(screen.getByTestId('panel-fade-in').props.pointerEvents).toBe('box-none');
});
