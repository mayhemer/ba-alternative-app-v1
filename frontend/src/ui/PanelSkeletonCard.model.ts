// ── A panel preview's card: how it reacts to being armed ──────────────────────
//
// Both pull previews (the lens and filter panels) outline their card by this,
// so a reaction to arming (ui/PullPreview: letting go now opens the panel) is
// set here once. For now there is none: the border stays the preview's own
// colour (`border`), armed too.

/** The border once armed; null: no change for now. */
const ARMED_BORDER: string | null = null;

export function panelSkeletonBorder(armed: boolean, border: string): string {
  return armed && ARMED_BORDER !== null ? ARMED_BORDER : border;
}
