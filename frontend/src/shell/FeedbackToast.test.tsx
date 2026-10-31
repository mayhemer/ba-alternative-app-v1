import React, { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { View } from 'react-native';
import { FeedbackToast, SectionFeedbackToast } from './FeedbackToast';
import { toastBand } from './FeedbackToast.model';
import { ScreenUIProvider, useFeedback, useStartProgress, type FeedbackAnchor } from './ScreenUIContext';
import { MAX_CONTENT_WIDTH } from '../styling/tokens';

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

// A short message ("Viewing Petra's schedule"), its icon slot, margins and paddings.
const MESSAGE_TOAST_WIDTH = 4 * 28 + 3 * 8 + 2 * 6 + 2 * 14;

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

  it.each([360, 375, 412])('leaves room for a short message on a %spt phone', (width) => {
    expect(toastBand(width, { left: 0, right: 0 }).width).toBeGreaterThanOrEqual(MESSAGE_TOAST_WIDTH);
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

  it.each([360, 375, 412, 800, 1400])('keeps a short message centred on a %spt screen', (width) => {
    expect(toastBand(width, { left: 0, right: 0 }).centeredWidth).toBeGreaterThanOrEqual(MESSAGE_TOAST_WIDTH);
  });

  it('narrows the centred span rather than crossing the band on a very small screen', () => {
    const band = toastBand(320, { left: 0, right: 0 });

    expect(band.centeredWidth).toBeLessThan(MESSAGE_TOAST_WIDTH);
    expect(band.width).toBeGreaterThanOrEqual(MESSAGE_TOAST_WIDTH);
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

function Trigger({ text, outcome }: { text: string; outcome: Outcome }) {
  const startProgress = useStartProgress();
  useEffect(() => {
    const tracker = startProgress(text);
    if (outcome === 'saved') { tracker.confirm(); }
    if (outcome === 'failed') { tracker.warn(new Error('disk')); }
  }, [startProgress, text, outcome]);
  return null;
}

async function show(text: string, outcome: Outcome = 'pending') {
  await render(
    <ScreenUIProvider>
      <Trigger text={text} outcome={outcome} />
      <FeedbackToast />
    </ScreenUIProvider>,
  );
}

it('shows the message with a spinner while in progress', async () => {
  await show('Saving');

  expect(screen.getByText('Saving')).toBeTruthy();
  expect(screen.getByTestId('feedback-progress')).toBeTruthy();
});

it('shows the message with a tick once done', async () => {
  await show('Saved', 'saved');

  expect(screen.getByText('Saved')).toBeTruthy();
  expect(screen.getByText('✓')).toBeTruthy();
});

// ── Next to what was tapped ───────────────────────────────────────────────────

function Message({ anchor }: { anchor?: FeedbackAnchor }) {
  const showFeedback = useFeedback();
  useEffect(() => { showFeedback('Link copied', 'confirmation', { anchor }); }, [showFeedback, anchor]);
  return null;
}

async function showWithSection(message: React.ReactNode) {
  await render(
    <ScreenUIProvider>
      {message}
      <FeedbackToast />
      <View testID="my-schedule-heading">
        <SectionFeedbackToast section="my-schedule" />
      </View>
    </ScreenUIProvider>,
  );
}

it('shows a My schedule message in that section, not over the screen', async () => {
  await showWithSection(<Message anchor={{ kind: 'my-schedule' }} />);

  expect(screen.getAllByTestId('feedback-toast')).toHaveLength(1);
  expect(within(screen.getByTestId('my-schedule-heading')).getByText('Link copied')).toBeTruthy();
});

it('shows any other message over the screen, not in the section', async () => {
  await showWithSection(<Message />);

  expect(screen.getAllByTestId('feedback-toast')).toHaveLength(1);
  expect(within(screen.getByTestId('my-schedule-heading')).queryByText('Link copied')).toBeNull();
});
