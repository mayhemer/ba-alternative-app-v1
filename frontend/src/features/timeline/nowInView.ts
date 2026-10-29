// ── Is now settled on the screen a day switcher drives? ───────────────────────
//
// The day switchers sit in the bottom bar, outside the screens they drive, and
// only today's button needs to know where the screen is scrolled — at the tap.
// So each screen registers a probe under its key (the timeline screen keys,
// My plan's PLAN_SCREEN_KEY) and the switcher asks it then, with no state
// passed through React and nothing re-rendered while scrolling.

const probes = new Map<string, () => boolean>();

/** Registers the screen's probe; returns its unregister, which leaves a newer probe alone. */
export function registerNowProbe(screenKey: string, probe: () => boolean): () => void {
  probes.set(screenKey, probe);
  return () => {
    if (probes.get(screenKey) === probe) {
      probes.delete(screenKey);
    }
  };
}

/** The screen's answer (DayButton.model's nowSettled); false while it has no probe. */
export function isNowSettled(screenKey: string): boolean {
  return probes.get(screenKey)?.() ?? false;
}
