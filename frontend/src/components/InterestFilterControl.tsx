import React, { useCallback } from 'react';
import { nextStatus } from '../context/InterestContext';
import { useArtistListFilter } from '../context/ArtistListFilterContext';
import { StarButton } from './StarButton';

// Module-level component — registered as TopBar RightComponent.
// Reads its own context directly; no props needed.
// Cycles: all → maybe+must_see → must_see only → all (via nextStatus)

const LABELS: Record<string, string> = {
  'null':     'Filter: show all',
  'maybe':    'Filter: maybe and must-see',
  'must_see': 'Filter: must-see only',
};

export function InterestFilterControl() {
  const { interestFilter, setInterestFilter } = useArtistListFilter();

  const handlePress = useCallback((): void => {
    const next = nextStatus(interestFilter ?? 'none');
    setInterestFilter(next === 'none' ? null : next);
  }, [interestFilter, setInterestFilter]);

  return (
    <StarButton
      status={interestFilter ?? 'none'}
      onPress={handlePress}
      label={LABELS[String(interestFilter)]}
    />
  );
}
