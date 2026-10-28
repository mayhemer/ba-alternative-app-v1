import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanCap } from './PlanCap';
import { planCapModel } from './PlanCap.model';
import { gapHeight } from './PlanGap.model';
import { getFestivalDayStart } from '../timeline/timelineLayout';
import type { DbEvent } from '../../types/backend';

const CLASH: DbEvent = { slug: 'test', eventId: 'e1', dateFrom: 0, dateTo: 1, artistId: 'a', stageId: 's', categoryId: 'c' };

/** Unix ms of a festival wall-clock time, e.g. at(7, '23:45') = Thu 7 Aug 23:45. */
function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

/** Thursday's festival day, 06:00 Thu → 06:00 Fri, its last listed set ending 23:45. */
const THU = getFestivalDayStart(at(7, '12:00'));
const thursdayEnd = (now: number) => ({ listedEnd: at(7, '23:45'), dayStart: THU, now });

// ── The day caps ──────────────────────────────────────────────────────────────
//
// A bare rail with no time behind it: a ring opens the day, a square closes it.

describe('planCapModel', () => {
  it('is as tall as a 20 min gap, at either end', () => {
    expect(planCapModel('start')).toEqual({ kind: 'cap', key: 'cap-start', edge: 'start', height: gapHeight(20), nowY: null, conflictTitle: null });
    expect(planCapModel('end')).toEqual({ kind: 'cap', key: 'cap-end', edge: 'end', height: gapHeight(20), nowY: null, conflictTitle: null });
  });

  it('carries no arrow on the end cap while the last listed set still plays', () => {
    expect(planCapModel('end', thursdayEnd(at(7, '23:44'))).nowY).toBeNull();
  });

  it('carries the arrow on the end cap from the minute the last listed set ends, centred on its square', () => {
    // 30 pt tall, the 10 pt square at its bottom: centred 25 pt down.
    expect(planCapModel('end', thursdayEnd(at(7, '23:45'))).nowY).toBe(25);
  });

  it('keeps the arrow on the end cap until the 06:00 day change, then drops it', () => {
    expect(planCapModel('end', thursdayEnd(at(8, '05:59'))).nowY).toBe(25);
    expect(planCapModel('end', thursdayEnd(at(8, '06:00'))).nowY).toBeNull();
  });

  it('carries no arrow on the end cap outside the festival, where now is never reached', () => {
    expect(planCapModel('end', thursdayEnd(Number.NEGATIVE_INFINITY)).nowY).toBeNull();
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

  it('draws the now arrow its model carries, centred on the end square', async () => {
    const { rerender } = await render(<PlanCap item={planCapModel('end', thursdayEnd(at(7, '23:44')))} />);
    expect(screen.queryByTestId('plan-now-arrow')).toBeNull();

    await rerender(<PlanCap item={planCapModel('end', thursdayEnd(at(8, '02:00')))} />);
    // Centre 25 pt down, the arrow 30 pt tall: its top at 10.
    expect(StyleSheet.flatten(screen.getByTestId('plan-now-arrow').props.style).top).toBe(10);
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
