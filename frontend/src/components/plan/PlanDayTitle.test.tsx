import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanDayTitle } from './PlanDayTitle';
import { planDayTitleModel, TITLE_HEIGHT } from './PlanDayTitle.model';
import { getFestivalDayStart } from '../timeline/timelineLayout';

// ── The day title ─────────────────────────────────────────────────────────────
//
// The weekday and date of the shown day, coloured by where it sits relative to
// today: today, a past or a future festival day, or any day outside the festival.

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at(7, '12:00'));

describe('planDayTitleModel', () => {
  it('names the day in festival time', () => {
    expect(planDayTitleModel(THU, at(7, '12:00'), true)).toEqual({
      kind: 'title', key: 'title', height: TITLE_HEIGHT, tone: 'today', weekday: 'Thursday', date: '7 Aug',
    });
  });

  it.each([
    ['today, at noon', at(7, '12:00'), true, 'today'],
    ['today, after midnight before the 06:00 day change', at(8, '03:00'), true, 'today'],
    ['a past festival day', at(8, '12:00'), true, 'past'],
    ['a future festival day', at(6, '12:00'), true, 'future'],
    ['outside the festival', at(1, '12:00'), false, 'outside'],
  ])('is toned for %s', (_name, now, duringFestival, tone) => {
    expect(planDayTitleModel(THU, now, duringFestival).tone).toBe(tone);
  });
});

describe('PlanDayTitle', () => {
  it('shows the weekday and the date as a header', async () => {
    await render(<PlanDayTitle item={planDayTitleModel(THU, at(7, '12:00'), true)} />);
    expect((screen.toJSON() as { props: { accessibilityRole?: string } }).props.accessibilityRole).toBe('header');
    expect(screen.getByText('Thursday')).toBeTruthy();
    expect(screen.getByText('7 Aug')).toBeTruthy();
  });
});
