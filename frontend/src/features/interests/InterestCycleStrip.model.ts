import { INTEREST_CYCLE, type InterestStatus } from './InterestContext';
import { getFeedbackLabel } from './StarButton.model';

// ── The toast's interest strip: what it shows ─────────────────────────────────
//
// Every interest state in tap order, the current one marked: where the star is
// now and where the next tap takes it. Its label names the current state, and
// says when saving it failed.

export type InterestCycleStripModel = {
  slots: { status: InterestStatus; current: boolean }[];
  label: string;
  /** The label read out: the state, and "not saved" after a failure. */
  accessibilityLabel: string;
  failed: boolean;
};

export function interestCycleStripModel(status: InterestStatus, failed: boolean): InterestCycleStripModel {
  const label = getFeedbackLabel(status);
  return {
    slots: INTEREST_CYCLE.map((step) => ({ status: step, current: step === status })),
    label,
    accessibilityLabel: failed ? `${label}, not saved` : label,
    failed,
  };
}
