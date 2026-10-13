import React, { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { FeedbackToast, toastBand } from './FeedbackToast';
import { ScreenUIProvider, useStartProgress } from '../../context/ScreenUIContext';
import type { InterestStatus } from '../../context/InterestContext';
import { MAX_CONTENT_WIDTH } from '../../styling/tokens';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// ── The toast never covers a star ─────────────────────────────────────────────
//
// It appears right after a star tap, and the user taps on: covering the star
// would swallow the next tap. Star buttons sit at the right end of the artist
// row (full window width) and of the detail header (the centred content column,
// which an expanded sheet lifts into the toast's height). Their reach, hit slop
// included, is measured here from each host's own layout rather than taken from
// the reserve the toast uses, so a drift in either shows up.

const ROW_STAR_REACH = 16 + 26 + 25;          // pr-4 + small icon + hit slop
const DETAIL_STAR_REACH = 16 + 32 + 5 + 30;   // padding + large icon + hit slop + web ✕

// What the cycle strip needs: 4 slots, 3 gaps, margins, paddings.
const STRIP_TOAST_WIDTH = 4 * 28 + 3 * 8 + 2 * 6 + 2 * 14;

const WIDTHS = [320, 360, 375, 412, 600, 700, 800, 1024, 1400];
const INSETS = [{ left: 0, right: 0 }, { left: 47, right: 47 }]; // portrait; landscape notch

describe('toastBand', () => {
  for (const width of WIDTHS) {
    for (const insets of INSETS) {
      it(`stays clear of every star at ${width}pt, insets ${insets.left}/${insets.right}`, () => {
        const band = toastBand(width, insets);
        const bandRight = band.left + band.width;

        // Artist row, laid out inside the safe area.
        expect(bandRight).toBeLessThanOrEqual(width - insets.right - ROW_STAR_REACH);

        // Detail header: the content column, centred within the safe area.
        const available = width - insets.left - insets.right;
        const column = Math.min(available, MAX_CONTENT_WIDTH);
        const columnRight = insets.left + (available - column) / 2 + column;
        expect(bandRight).toBeLessThanOrEqual(columnRight - DETAIL_STAR_REACH);

        expect(band.left).toBeGreaterThanOrEqual(insets.left);
      });
    }
  }

  it.each([360, 375, 412])('leaves room for the whole cycle strip on a %spt phone', (width) => {
    expect(toastBand(width, { left: 0, right: 0 }).width).toBeGreaterThanOrEqual(STRIP_TOAST_WIDTH);
  });

  // A toast is centred on the screen when it fits; only a wider one moves left.
  for (const width of WIDTHS) {
    it(`centres within the band, ending at its right edge, at ${width}pt`, () => {
      const band = toastBand(width, { left: 0, right: 0 });
      const bandRight = band.left + band.width;

      expect(band.centeredWidth).toBeLessThanOrEqual(band.width);
      // The centred span ends at the band's edge and is centred on the screen.
      expect(bandRight - band.centeredWidth / 2).toBeCloseTo(width / 2);
    });
  }

  it.each([360, 375, 412, 800, 1400])('keeps the cycle strip centred on a %spt screen', (width) => {
    expect(toastBand(width, { left: 0, right: 0 }).centeredWidth).toBeGreaterThanOrEqual(STRIP_TOAST_WIDTH);
  });

  it('narrows the centred span rather than crossing the band on a very small screen', () => {
    const band = toastBand(320, { left: 0, right: 0 });

    expect(band.centeredWidth).toBeLessThan(STRIP_TOAST_WIDTH);
    expect(band.width).toBeGreaterThanOrEqual(STRIP_TOAST_WIDTH);
  });
});

// ── What the toast shows ──────────────────────────────────────────────────────
//
// A confirmed toast schedules its own dismissal; fake timers keep that timer
// from outliving the test.

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

type Outcome = 'pending' | 'saved' | 'failed';

function Trigger({ text, interest, outcome }: { text: string; interest?: InterestStatus; outcome: Outcome }) {
  const startProgress = useStartProgress();
  useEffect(() => {
    const tracker = startProgress(text, interest);
    if (outcome === 'saved') { tracker.confirm(); }
    if (outcome === 'failed') { tracker.warn(new Error('disk')); }
  }, [startProgress, text, interest, outcome]);
  return null;
}

async function show(text: string, interest?: InterestStatus, outcome: Outcome = 'pending') {
  await render(
    <ScreenUIProvider>
      <Trigger text={text} interest={interest} outcome={outcome} />
      <FeedbackToast />
    </ScreenUIProvider>,
  );
}

it('shows the whole interest cycle after a star tap, the current state marked', async () => {
  await show("Don't go", 'dont_go');

  expect(screen.getByLabelText("Don't go")).toBeTruthy();
  expect(screen.getByText("Don't go")).toBeTruthy();
  // Exactly one state is marked current (getByTestId throws on more), and it
  // holds the struck-out star.
  const current = screen.getByTestId('interest-cycle-current');
  expect(within(current).getByTestId('star-strike')).toBeTruthy();
});

// The spinner and tick would only track the instant local write; the star
// itself already shows the change.
it.each(['pending', 'saved'] as Outcome[])('shows no progress or tick for a star tap (%s)', async (outcome) => {
  await show('Must see!', 'will_go', outcome);

  expect(screen.queryByText('✓')).toBeNull();
  expect(screen.queryByTestId('feedback-progress')).toBeNull();
});

it('still says when a star tap failed to save', async () => {
  await show('Must see!', 'will_go', 'failed');

  expect(screen.getByLabelText('Must see!, not saved')).toBeTruthy();
});

it('shows plain text, with progress and tick, for any other message', async () => {
  await show('Saved', undefined, 'saved');

  expect(screen.getByText('Saved')).toBeTruthy();
  expect(screen.getByText('✓')).toBeTruthy();
  expect(screen.queryByTestId('interest-cycle-current')).toBeNull();
});
