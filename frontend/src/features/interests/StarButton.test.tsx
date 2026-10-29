import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StarButton, StarIndicator } from './StarButton';
import type { InterestStatus } from './InterestContext';

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
