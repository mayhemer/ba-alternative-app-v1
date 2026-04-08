import type { InterestStatus } from '../context/InterestContext';

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
