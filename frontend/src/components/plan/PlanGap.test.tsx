import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanGap } from './PlanGap';
import { planGapModel } from './PlanGap.model';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── A gap between sets, as drawn ──────────────────────────────────────────────
//
// The component draws its model and nothing else: the label, the height, the
// fill and the arrow all come from planGapModel.

function at(hm: string): number {
  return Date.parse(`2025-08-07T${hm}:00+02:00`);
}

function setAt(hm: string): DbEvent {
  return { slug: 'test', eventId: `e${hm}`, dateFrom: at(hm), dateTo: at(hm) + 45 * 60 * 1000, artistId: 'a', stageId: 's', categoryId: 'c' };
}

it('is as tall as its model, labelled with its length', async () => {
  const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('12:00'), false);
  await render(<PlanGap item={gap} />);
  expect(screen.getByText('2 h')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('plan-gap').props.style).height).toBe(gap.height);
  expect(screen.queryByTestId('plan-gap-progress')).toBeNull();
  expect(screen.queryByTestId('plan-now-arrow')).toBeNull();
});

it('while current, shows the countdown, the fill and the arrow at the tip of the fill', async () => {
  const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false);
  await render(<PlanGap item={gap} />);
  expect(screen.getByText('−1 h 20')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('plan-gap-fill').props.style).height).toBe(`${gap.progress * 100}%`);
  expect(StyleSheet.flatten(screen.getByTestId('plan-now-arrow').props.style).top).toBe(gap.nowY! - 15);
});

it('draws a countdown to a Maybe at regular size, in a dashed box in the break blue', async () => {
  const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false, 'maybe');
  await render(<PlanGap item={gap} />);
  const box = StyleSheet.flatten(screen.getByTestId('plan-gap-maybe-box').props.style);
  expect(box.borderStyle).toBe('dashed');
  expect(box.borderWidth).toBe(1);
  expect(box.borderColor).toBe(colors.breakBlue);
  const text = StyleSheet.flatten(screen.getByText('−1 h 20').props.style);
  expect(text.fontSize).toBe(13);
  expect(text.color).toBe(colors.breakBlue);
});

it('draws a countdown to a Must-see bold and larger, with no box', async () => {
  const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false, 'will_go');
  await render(<PlanGap item={gap} />);
  expect(screen.queryByTestId('plan-gap-maybe-box')).toBeNull();
  expect(StyleSheet.flatten(screen.getByText('−1 h 20').props.style).fontSize).toBe(15);
});

it('draws the conflict title its model carries, which opens the clash', async () => {
  const onPressConflict = jest.fn();
  const gap = planGapModel('g', at('18:40'), setAt('19:00'), at('12:00'), false);
  const { rerender } = await render(<PlanGap item={gap} onPressConflict={onPressConflict} />);
  expect(screen.queryByText('Conflict')).toBeNull();

  await rerender(<PlanGap item={{ ...gap, conflictTitle: setAt('19:00') }} onPressConflict={onPressConflict} />);
  await fireEvent.press(screen.getByText('Conflict'));
  expect(onPressConflict).toHaveBeenCalledWith(setAt('19:00'));
});

it('draws the start ring only on the day-start break', async () => {
  const { rerender } = await render(<PlanGap item={planGapModel('opening', at('08:00'), setAt('14:00'), at('11:00'), true)} />);
  expect(screen.getByTestId('plan-rail-start')).toBeTruthy();
  await rerender(<PlanGap item={planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false)} />);
  expect(screen.queryByTestId('plan-rail-start')).toBeNull();
});
