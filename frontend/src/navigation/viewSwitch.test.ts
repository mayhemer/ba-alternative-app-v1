import { lastTimelineSupport, noteTimelineShown } from './viewSwitch';

// ── Which timeline My plan switches to ────────────────────────────────────────
//
// The day buttons switch My plan to the timeline last shown, the Program until
// either has been. Dimensions: none shown yet, the Support Program, then the
// Program again.

describe('the last timeline shown', () => {
  it('is the Program until a timeline has been shown, then follows the last one', () => {
    expect(lastTimelineSupport()).toBe(false);
    noteTimelineShown(true);
    expect(lastTimelineSupport()).toBe(true);
    noteTimelineShown(false);
    expect(lastTimelineSupport()).toBe(false);
  });
});
