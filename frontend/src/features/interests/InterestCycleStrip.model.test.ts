import { interestCycleStripModel } from './InterestCycleStrip.model';

// ── The toast's interest strip, as a model ────────────────────────────────────

describe('interestCycleStripModel', () => {
  it('shows every state in tap order, the current one marked', () => {
    expect(interestCycleStripModel('maybe', false).slots).toEqual([
      { status: 'none', current: false },
      { status: 'maybe', current: true },
      { status: 'will_go', current: false },
      { status: 'dont_go', current: false },
    ]);
  });

  it('names the current state', () => {
    expect(interestCycleStripModel('will_go', false)).toMatchObject({ label: 'Must see!', accessibilityLabel: 'Must see!', failed: false });
  });

  it('says when saving failed', () => {
    expect(interestCycleStripModel('will_go', true)).toMatchObject({ label: 'Must see!', accessibilityLabel: 'Must see!, not saved', failed: true });
  });
});
