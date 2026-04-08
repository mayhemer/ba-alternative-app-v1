import React, { useCallback } from 'react';
import type { InterestStatus } from '../context/InterestContext';
import { nextStatus } from '../context/InterestContext';
import { StarButton } from './StarButton';
import { useArtistListFilter } from '../context/ArtistListFilterContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';

// ── Shared labels ─────────────────────────────────────────────────────────────

export const INTEREST_FILTER_LABELS: Record<string, string> = {
  'null':     'Filter: show all',
  'maybe':    'Filter: maybe and must-see',
  'must_see': 'Filter: must-see only',
};

// ── StarFilterButton ──────────────────────────────────────────────────────────
// Presentational cycling button. No context dependency — wired by the caller.

type StarFilterButtonProps = {
  value: InterestStatus | null;
  onChange: (next: InterestStatus | null) => void;
};

export function StarFilterButton({ value, onChange }: StarFilterButtonProps) {
  const handlePress = useCallback((): void => {
    const next = nextStatus(value ?? 'none');
    onChange(next === 'none' ? null : next);
  }, [value, onChange]);

  return (
    <StarButton
      status={value ?? 'none'}
      onPress={handlePress}
      label={INTEREST_FILTER_LABELS[String(value)]}
    />
  );
}

// ── ArtistListInterestFilterControl ───────────────────────────────────────────
// Context-aware wrapper for the artist list screen.

export function ArtistListInterestFilterControl() {
  const { interestFilter, setInterestFilter } = useArtistListFilter();
  return <StarFilterButton value={interestFilter} onChange={setInterestFilter} />;
}

// ── TimelineInterestFilterControl ─────────────────────────────────────────────
// Context-aware wrapper for the timeline screen.

export function TimelineInterestFilterControl() {
  const { interestFilter, setInterestFilter } = useTimelineFilter();
  return <StarFilterButton value={interestFilter} onChange={setInterestFilter} />;
}
