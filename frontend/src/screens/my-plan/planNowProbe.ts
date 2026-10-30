// ── Is now in My plan's view? ─────────────────────────────────────────────────
//
// The now pill sits in the top bar, outside My plan, and needs to know where
// the list is scrolled only at a tap. So My plan registers a probe here
// (planNowInView on its refs) and the pill asks it then, with no state passed
// through React and nothing re-rendered while scrolling.

let probe: (() => boolean) | null = null;

/** Registers My plan's probe; returns its unregister, which leaves a newer probe alone. */
export function registerPlanNowProbe(next: () => boolean): () => void {
  probe = next;
  return () => {
    if (probe === next) {
      probe = null;
    }
  };
}

/** My plan's answer (planNowInView); false while it has no probe. */
export function isPlanNowInView(): boolean {
  return probe?.() ?? false;
}
