import type { InterestStatus } from '../context/InterestContext';
import type { SharedInterestStatus } from '../adapters/baShareApiAdapter';

/**
 * Returns true if an artist with the given status passes the interest filter.
 * null filter = show all; 'maybe' = at least maybe (maybe or must_see); 'must_see' = must_see only.
 */
export function matchesInterestFilter(
  artistStatus: InterestStatus,
  filter: InterestStatus | null,
): boolean {
  if (filter === null)        { return true; }
  if (filter === 'maybe')     { return artistStatus === 'maybe' || artistStatus === 'must_see'; }
  return artistStatus === filter;
}

// ── Lens scope ──────────────────────────────────────────────────────────────────
//
// A single global "lens" decides whose schedule the artist list and timelines
// reflect. `level` is the same 3-state filter applied within the chosen source.

export type ScopeLevel = 'maybe' | 'must_see' | null;

export type LensScope =
  | { kind: 'all' }                                       // everything (today's default)
  | { kind: 'me'; level: ScopeLevel }                     // my picks, filtered by level
  | { kind: 'friend'; token: string; level: ScopeLevel }; // a friend's picks (read-only inspect)

export const DEFAULT_SCOPE: LensScope = { kind: 'all' };

// Maps a friend's server status to the local 3-state value so it can reuse the filter.
function friendStatusToLocal(status: SharedInterestStatus): InterestStatus {
  return status === 'will_go' ? 'must_see' : 'maybe';
}

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
    if (scope.level === null) { return myStatus !== 'none'; }
    return matchesInterestFilter(myStatus, scope.level);
  }
  // friend
  if (friendStatus === undefined) { return false; }
  if (scope.level === null) { return true; }
  return matchesInterestFilter(friendStatusToLocal(friendStatus), scope.level);
}
