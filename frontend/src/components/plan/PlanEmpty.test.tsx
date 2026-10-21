import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanEmpty } from './PlanEmpty';
import { planEmptyModel } from './PlanEmpty.model';

// ── An empty day ──────────────────────────────────────────────────────────────

describe('planEmptyModel', () => {
  it('says nothing is planned, or with only conflicts shown, that there are none', () => {
    expect(planEmptyModel(false).text).toBe('Nothing planned for this day');
    expect(planEmptyModel(true).text).toBe('No conflicts on this day');
  });
});

describe('PlanEmpty', () => {
  it('shows its model\'s text', async () => {
    await render(<PlanEmpty item={planEmptyModel(true)} />);
    expect(screen.getByText('No conflicts on this day')).toBeTruthy();
  });
});
