import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LensChipView } from '../features/social/LensChipView';
import { PlanFilterChipView } from '../screens/my-plan/filter/PlanFilterChipView';
import type { LensChipModel } from '../features/social/LensChip.model';
import type { PlanFilterChipModel } from '../screens/my-plan/filter/PlanFilterChip.model';
import { colors } from '../styling/tokens';

// ── The top bar's "state + ⋮" chips, as drawn ─────────────────────────────────
//
// The lens chip (Artists, Program) and My plan's filter chip share one frame: a
// 24 pt state slot right against a 14 pt slot for the dots, 38 pt in all, so
// both leave the same room to the right of the now pill.
//
// Dimensions: which chip (lens, filter); what its state slot holds (a star, a
// friend's avatar with its badge).

const NO_OP = (): void => undefined;

const LENS_STAR: LensChipModel = { key: 'lens-chip', state: { kind: 'star', icon: 'star', color: colors.accent }, dotsColor: colors.textPrimary };
const LENS_FRIEND: LensChipModel = { key: 'lens-chip', state: { kind: 'friend', label: 'Eva' }, dotsColor: colors.textPrimary };
const FILTER: PlanFilterChipModel = {
  key: 'plan-filter-chip',
  state: { testID: 'plan-filter-state-maybe-on', icon: 'star-half', color: colors.accent },
  dotsColor: colors.textPrimary,
  expanded: false,
};

function frame(): { state: { width?: unknown; marginRight?: unknown }; dots: { width?: unknown; marginLeft?: unknown } } {
  return {
    state: StyleSheet.flatten(screen.getByTestId('topbar-chip-state').props.style),
    dots: StyleSheet.flatten(screen.getByTestId('topbar-chip-dots').props.style),
  };
}

it.each([
  ['the lens chip with a star', <LensChipView key="star" item={LENS_STAR} onPress={NO_OP} />],
  ['the lens chip with a friend', <LensChipView key="friend" item={LENS_FRIEND} onPress={NO_OP} />],
  ['the filter chip', <PlanFilterChipView key="filter" item={FILTER} onPress={NO_OP} />],
])('%s: a 24 pt state slot right against a 14 pt dots slot', async (_name, chip) => {
  await render(chip);
  const { state, dots } = frame();
  expect(state.width).toBe(24);
  expect(state.marginRight ?? 0).toBe(0);
  expect(dots.width).toBe(14);
  expect(dots.marginLeft ?? 0).toBe(0);
});
