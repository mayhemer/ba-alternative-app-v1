import { isNowSettled, registerNowProbe } from './nowInView';

// ── Asking a screen whether now is settled on it ──────────────────────────────
//
// The day switcher sits in the bottom bar, outside the screen it drives; the
// screen registers a probe under its key and the switcher asks it at the tap.
// Dimensions: no probe registered, one registered, unregistered, replaced by a
// newer one before the older one unregisters (a remount).

describe('the now-settled probes', () => {
  it('a screen with no probe: not settled, so the tap scrolls to now', () => {
    expect(isNowSettled('nowhere')).toBe(false);
  });

  it('answers with the probe registered for the screen', () => {
    const unregister = registerNowProbe('a', () => true);
    expect(isNowSettled('a')).toBe(true);
    expect(isNowSettled('b')).toBe(false);
    unregister();
    expect(isNowSettled('a')).toBe(false);
  });

  it('an older probe unregistering leaves a newer one in place', () => {
    const older = registerNowProbe('c', () => false);
    const newer = registerNowProbe('c', () => true);
    older();
    expect(isNowSettled('c')).toBe(true);
    newer();
    expect(isNowSettled('c')).toBe(false);
  });
});
