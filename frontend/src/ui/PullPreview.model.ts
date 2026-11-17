// ── The pull preview: where it stands, and when letting go opens ──────────────
//
// A preview of the panel a pull opens stands in the gap the pull opens above
// the content, cut to it. For the first PULL_ARM_DISTANCE it comes down with the
// content's top edge; from there it stays where the panel opens, and a longer
// pull uncovers more of it, top first. From PULL_ARM_DISTANCE on it is armed:
// letting go opens the panel. Drawing and release follow these functions, so
// what shows armed is what opens.

/**
 * Whether any scroller has the pull (ui/PullPreview › usePullPastTop). Off on
 * every screen and platform since 2026-11-17; the code stays, so switching it
 * back on is this line. Off, a scroller keeps its own handlers and gets no
 * bounce or preview, and the screens' chips are the way into their panels.
 */
export const PULL_PAST_TOP_ENABLED = false;

/**
 * How far a pull goes before letting go opens the panel. My plan's filter
 * preview is as tall (PlanFilterSkeleton.model), so it is all out just then.
 */
export const PULL_ARM_DISTANCE = 84;

export type PreviewPosition = {
  /** The gap: how much of the preview shows, from the scroller's top edge down. */
  reveal: number;
  /** The preview's top, from the scroller's top edge: -PULL_ARM_DISTANCE hidden, 0 where the panel opens. */
  offset: number;
};

export function previewPosition(pull: number): PreviewPosition {
  const reveal = Math.max(pull, 0);
  return { reveal, offset: Math.min(reveal, PULL_ARM_DISTANCE) - PULL_ARM_DISTANCE };
}

/** Letting go at a pull of `pull` pt opens the panel. */
export function isArmed(pull: number): boolean {
  return pull >= PULL_ARM_DISTANCE;
}
