import React from 'react';
import { act, render } from '@testing-library/react-native';
import { endLandingHighlight, LANDING_UNCLAIMED_MS, showLandingHighlight, useLandingHighlight } from './landingHighlight';

// ── The landed set's highlight ────────────────────────────────────────────────
//
// Dimensions: the element showing the landed set vs any other; the element
// ending its highlight, or never doing so (the set was never drawn); an ending
// that comes late, after a newer landing; the same set landed on again.

let renders: Record<string, number> = {};
const seen: Record<string, number | null> = {};

function Probe({ eventId }: { eventId: string }) {
  const token = useLandingHighlight(eventId);
  renders[eventId] = (renders[eventId] ?? 0) + 1;
  seen[eventId] = token;
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  renders = {};
});

afterEach(async () => {
  await act(async () => { jest.runOnlyPendingTimers(); });
  jest.useRealTimers();
});

describe('useLandingHighlight', () => {
  it('lights only the landed set, until its element ends it', async () => {
    await render(<><Probe eventId="a" /><Probe eventId="b" /></>);
    expect([seen.a, seen.b]).toEqual([null, null]);

    await act(async () => { showLandingHighlight('a'); });
    expect(seen.a).not.toBeNull();
    expect(seen.b).toBeNull();

    // However long the element takes to show it, the store does not end it first.
    await act(async () => { jest.advanceTimersByTime(LANDING_UNCLAIMED_MS - 1); });
    expect(seen.a).not.toBeNull();

    await act(async () => { endLandingHighlight(seen.a!); });
    expect(seen.a).toBeNull();
  });

  it('ends by itself when no element ends it, as for a set never drawn', async () => {
    await render(<Probe eventId="a" />);
    await act(async () => { showLandingHighlight('a'); });
    await act(async () => { jest.advanceTimersByTime(LANDING_UNCLAIMED_MS - 1); });
    expect(seen.a).not.toBeNull();
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(seen.a).toBeNull();
  });

  it('renders again only the elements whose highlight changes', async () => {
    await render(<><Probe eventId="a" /><Probe eventId="b" /></>);
    renders = {};
    await act(async () => { showLandingHighlight('a'); });
    expect(renders).toEqual({ a: 1 });
  });

  it('starts over when the same set is landed on again, and a late end of the first landing is ignored', async () => {
    await render(<Probe eventId="a" />);
    await act(async () => { showLandingHighlight('a'); });
    const first = seen.a!;
    await act(async () => { showLandingHighlight('a'); });
    expect(seen.a).not.toBe(first);
    await act(async () => { endLandingHighlight(first); });
    expect(seen.a).not.toBeNull();
  });

  it('moves to the next set landed on, and the first one\'s late end leaves it lit', async () => {
    await render(<><Probe eventId="a" /><Probe eventId="b" /></>);
    await act(async () => { showLandingHighlight('a'); });
    const first = seen.a!;
    await act(async () => { showLandingHighlight('b'); });
    expect(seen.a).toBeNull();
    expect(seen.b).not.toBeNull();
    await act(async () => { endLandingHighlight(first); });
    expect(seen.b).not.toBeNull();
  });

  it('gives the next landing its own unclaimed time', async () => {
    await render(<Probe eventId="b" />);
    await act(async () => { showLandingHighlight('a'); });
    await act(async () => { jest.advanceTimersByTime(LANDING_UNCLAIMED_MS - 100); });
    await act(async () => { showLandingHighlight('b'); });
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(seen.b).not.toBeNull();
  });
});
