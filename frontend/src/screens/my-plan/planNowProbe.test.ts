import { isPlanNowInView, registerPlanNowProbe } from './planNowProbe';

// ── Asking My plan whether now is in its view ─────────────────────────────────
//
// The now pill sits in the top bar, outside My plan; the screen registers a
// probe and the pill asks it at the tap. Dimensions: no probe registered, one
// registered, unregistered, replaced by a newer one before the older one
// unregisters (a remount).

describe('the plan now probe', () => {
  it('no probe: not in view, so the tap scrolls My plan to now', () => {
    expect(isPlanNowInView()).toBe(false);
  });

  it('answers with the registered probe until it unregisters', () => {
    const unregister = registerPlanNowProbe(() => true);
    expect(isPlanNowInView()).toBe(true);
    unregister();
    expect(isPlanNowInView()).toBe(false);
  });

  it('an older probe unregistering leaves a newer one in place', () => {
    const older = registerPlanNowProbe(() => false);
    const newer = registerPlanNowProbe(() => true);
    older();
    expect(isPlanNowInView()).toBe(true);
    newer();
    expect(isPlanNowInView()).toBe(false);
  });
});
