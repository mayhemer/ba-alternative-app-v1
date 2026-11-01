import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StarButton, StarIndicator } from './StarButton';
import type { InterestStatus } from './InterestContext';

// The icon font's glyph, as a stand-in that counts its mounts: a remount is a
// new native view under the finger.
let mockGlyphMounts = 0;
jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockIonicons({ name }: { name: string }) {
    ReactActual.useEffect(() => { mockGlyphMounts += 1; }, []);
    return ReactActual.createElement(Text, null, name);
  };
});

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

// ── A quick second tap ────────────────────────────────────────────────────────
//
// A press re-renders the star while a quick second tap may already be down on
// it. If that render replaced the glyph's view, the second tap would have
// started on a view that no longer exists, and on native its release never
// reaches the button: the press is lost. So the glyph stays the same view
// whatever the status, and the strike bar never takes a touch.

describe('StarButton under a quick second tap', () => {
  it.each([
    ['will_go', 'dont_go'],
    ['dont_go', 'none'],
    ['none', 'maybe'],
  ] as [InterestStatus, InterestStatus][])('keeps the same glyph from %s to %s', async (from, to) => {
    const view = await render(<StarButton status={from} onPress={() => undefined} label="Toggle interest" />);
    mockGlyphMounts = 0;

    await view.rerender(<StarButton status={to} onPress={() => undefined} label="Toggle interest" />);

    expect(mockGlyphMounts).toBe(0);
  });

  it('never lets the strike bar take a touch', async () => {
    await render(<StarButton status="dont_go" onPress={() => undefined} label="Toggle interest" />);

    expect(screen.getByTestId('star-strike').props.pointerEvents).toBe('none');
  });
});
