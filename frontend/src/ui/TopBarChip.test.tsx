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
// While its panel is open a chip is drawn open: an accent background with
// rounded corners, reaching 6 pt past the glyphs on either side without moving
// them (the glyphs turn black in the chip's model).
//
// Dimensions: which chip (lens, filter); what its state slot holds (a star, a
// friend's avatar with its badge); its panel closed or open.

const NO_OP = (): void => undefined;

const LENS_STAR: LensChipModel = { key: 'lens-chip', state: { kind: 'star', icon: 'star', color: colors.accent }, dotsColor: colors.textPrimary, open: false };
const LENS_FRIEND: LensChipModel = { key: 'lens-chip', state: { kind: 'friend', label: 'Eva' }, dotsColor: colors.textPrimary, open: false };
const LENS_OPEN: LensChipModel = { key: 'lens-chip', state: { kind: 'star', icon: 'star', color: colors.black }, dotsColor: colors.black, open: true };
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

type ChipStyle = { backgroundColor?: unknown; borderRadius?: unknown; paddingHorizontal?: unknown; marginHorizontal?: unknown };

function chipStyle(): ChipStyle {
  return StyleSheet.flatten(screen.getByRole('button').props.style);
}

it.each([
  ['the lens chip', <LensChipView key="lens" item={LENS_OPEN} onPress={NO_OP} />],
  ['the filter chip', <PlanFilterChipView key="filter" item={{ ...FILTER, expanded: true }} onPress={NO_OP} />],
])('%s, open: an accent background with rounded corners, 6 pt past the glyphs', async (_name, chip) => {
  await render(chip);
  expect(chipStyle()).toMatchObject({ backgroundColor: colors.accent, borderRadius: 2, paddingHorizontal: 6, marginHorizontal: -6 });
});

it.each([
  ['the lens chip', <LensChipView key="lens" item={LENS_STAR} onPress={NO_OP} />],
  ['the filter chip', <PlanFilterChipView key="filter" item={FILTER} onPress={NO_OP} />],
])('%s, closed: no background, in the same place as open', async (_name, chip) => {
  await render(chip);
  const style = chipStyle();
  expect(style.backgroundColor ?? 'transparent').toBe('transparent');
  expect(style).toMatchObject({ paddingHorizontal: 6, marginHorizontal: -6 });
});
