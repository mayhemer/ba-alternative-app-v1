import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanCap } from './PlanCap';
import { planCapModel } from './PlanCap.model';
import { gapHeight } from './PlanGap.model';
import type { DbEvent } from '../../types/backend';

const CLASH: DbEvent = { slug: 'test', eventId: 'e1', dateFrom: 0, dateTo: 1, artistId: 'a', stageId: 's', categoryId: 'c' };

// ── The day caps ──────────────────────────────────────────────────────────────
//
// A bare rail with no time behind it: a ring opens the day, a square closes it.

describe('planCapModel', () => {
  it('is as tall as a 20 min gap, at either end', () => {
    expect(planCapModel('start')).toEqual({ kind: 'cap', key: 'cap-start', edge: 'start', height: gapHeight(20), conflictTitle: null });
    expect(planCapModel('end')).toEqual({ kind: 'cap', key: 'cap-end', edge: 'end', height: gapHeight(20), conflictTitle: null });
  });
});

describe('PlanCap', () => {
  it('opens the day with a ring and closes it with a square, as tall as its model', async () => {
    const start = planCapModel('start');
    const { rerender } = await render(<PlanCap item={start} />);
    expect(screen.getByTestId('plan-rail-start')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('plan-cap').props.style).height).toBe(start.height);

    await rerender(<PlanCap item={planCapModel('end')} />);
    expect(screen.getByTestId('plan-rail-end')).toBeTruthy();
    expect(screen.queryByTestId('plan-rail-start')).toBeNull();
  });

  it('draws the conflict title its model carries, which opens the clash', async () => {
    const onPressConflict = jest.fn();
    const { rerender } = await render(<PlanCap item={planCapModel('start')} onPressConflict={onPressConflict} />);
    expect(screen.queryByText('Conflict')).toBeNull();

    await rerender(<PlanCap item={{ ...planCapModel('start'), conflictTitle: CLASH }} onPressConflict={onPressConflict} />);
    await fireEvent.press(screen.getByText('Conflict'));
    expect(onPressConflict).toHaveBeenCalledWith(CLASH);
  });
});
