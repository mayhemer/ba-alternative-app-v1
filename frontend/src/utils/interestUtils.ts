import type { InterestStatus } from '../context/InterestContext';
import type { SharedInterestStatus } from '../adapters/baShareApiAdapter';

/**
 * True for the statuses that count as a pick. 'dont_go' is a decision against
 * the artist, so everything but the star button treats it like 'none'.
 */
export function isInterested(status: InterestStatus): status is 'maybe' | 'will_go' {
  return status === 'maybe' || status === 'will_go';
}

/**
 * Returns true if an artist with the given status passes the interest filter.
 * null filter = show all; 'maybe' = at least maybe (maybe or will_go); 'will_go' = will_go only.
 */
export function matchesInterestFilter(
  artistStatus: InterestStatus,
  filter: ScopeLevel,
): boolean {
  if (filter === null)        { return true; }
  if (filter === 'maybe')     { return artistStatus === 'maybe' || artistStatus === 'will_go'; }
  return artistStatus === filter;
}

// ── Lens scope ──────────────────────────────────────────────────────────────────
//
// A single global "lens" decides whose schedule the artist list and timelines
// reflect. `level` is the same 3-state filter applied within the chosen source.

export type ScopeLevel = 'maybe' | 'will_go' | null;

export type LensScope =
  | { kind: 'all' }                                       // everything (today's default)
  | { kind: 'me'; level: ScopeLevel }                     // my picks, filtered by level
  | { kind: 'friend'; token: string; level: ScopeLevel }; // a friend's picks (read-only inspect)

export const DEFAULT_SCOPE: LensScope = { kind: 'all' };

/**
 * Decides whether an artist passes the active lens.
 * - `myStatus`: the viewer's own status for the artist.
 * - `friendStatus`: the focused friend's status for the artist (only consulted for a friend scope).
 */
export function matchesScope(
  scope: LensScope,
  myStatus: InterestStatus,
  friendStatus: SharedInterestStatus | undefined,
): boolean {
  if (scope.kind === 'all') { return true; }
  if (scope.kind === 'me') {
    if (scope.level === null) { return isInterested(myStatus); }
    return matchesInterestFilter(myStatus, scope.level);
  }
  // friend
  if (friendStatus === undefined) { return false; }
  if (scope.level === null) { return true; }
  return matchesInterestFilter(friendStatus, scope.level);
}
