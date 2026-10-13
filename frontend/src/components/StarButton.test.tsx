import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StarButton, StarIndicator } from './StarButton';
import { StarFilterButton } from './InterestFilterControl';
import type { InterestStatus } from '../context/InterestContext';

// ── What each status looks like ───────────────────────────────────────────────
//
// 'dont_go' shows only on the star button (a struck-out star); the indicators
// next to names in the timeline, conflicts and sheets treat it like 'none'.


describe('StarIndicator', () => {
  it.each(['none', 'dont_go'] as InterestStatus[])('renders nothing for %s', async (status) => {
    const view = await render(<StarIndicator status={status} />);

    expect(view.toJSON()).toBeNull();
  });

  it.each(['maybe', 'will_go'] as InterestStatus[])('renders a star for %s', async (status) => {
    const view = await render(<StarIndicator status={status} />);

    expect(view.toJSON()).not.toBeNull();
  });
});

describe('StarButton', () => {
  it('strikes the star out for dont_go', async () => {
    await render(<StarButton status="dont_go" onPress={() => undefined} label="Toggle interest" />);

    expect(screen.getByTestId('star-strike')).toBeTruthy();
  });

  it.each(['none', 'maybe', 'will_go'] as InterestStatus[])('does not strike %s', async (status) => {
    await render(<StarButton status={status} onPress={() => undefined} label="Toggle interest" />);

    expect(screen.queryByTestId('star-strike')).toBeNull();
  });
});

// The filter level is not the interest cycle: 'dont_go' is not something to filter by.
describe('StarFilterButton', () => {
  it.each([
    [null, 'maybe'],
    ['maybe', 'will_go'],
    ['will_go', null],
  ] as const)('steps from %s to %s', async (value, next) => {
    const onChange = jest.fn();
    await render(<StarFilterButton value={value} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith(next);
  });
});
