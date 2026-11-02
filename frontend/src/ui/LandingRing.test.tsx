import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { LANDING_RING, LandingRing } from './LandingRing';

// ── The highlight on the element a jump landed on ─────────────────────────────
//
// Dimensions: time since the ring was put on screen (before, at the end of its
// hold); a new landing (a new key) during the hold; the ring taken away early.

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

describe('LandingRing', () => {
  it('is a plain frame, at full strength, for its whole hold', async () => {
    const onEnd = jest.fn();
    await render(<LandingRing token={7} onEnd={onEnd} />);
    expect(screen.getByTestId('landing-ring')).toHaveStyle({ borderWidth: LANDING_RING.width, opacity: 1 });
    await act(async () => { jest.advanceTimersByTime(LANDING_RING.holdMs - 1); });
    expect(screen.getByTestId('landing-ring')).toHaveStyle({ opacity: 1 });
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('ends its landing a hold after it was put on screen, not after the landing began', async () => {
    const onEnd = jest.fn();
    await render(<LandingRing token={7} onEnd={onEnd} />);
    await act(async () => { jest.advanceTimersByTime(LANDING_RING.holdMs); });
    expect(onEnd).toHaveBeenCalledWith(7);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('starts its hold over for a new landing', async () => {
    const onEnd = jest.fn();
    const { rerender } = await render(<LandingRing key={7} token={7} onEnd={onEnd} />);
    await act(async () => { jest.advanceTimersByTime(LANDING_RING.holdMs - 100); });
    await rerender(<LandingRing key={8} token={8} onEnd={onEnd} />);
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(onEnd).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(LANDING_RING.holdMs - 100); });
    expect(onEnd).toHaveBeenCalledWith(8);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ends nothing once taken away', async () => {
    const onEnd = jest.fn();
    const { unmount } = await render(<LandingRing token={7} onEnd={onEnd} />);
    await act(async () => { unmount(); });
    await act(async () => { jest.advanceTimersByTime(LANDING_RING.holdMs); });
    expect(onEnd).not.toHaveBeenCalled();
  });
});
