import React, { useCallback } from 'react';
import type { ScopeLevel } from '../utils/interestUtils';
import { StarButton } from './StarButton';

// ── Shared labels ─────────────────────────────────────────────────────────────

export const INTEREST_FILTER_LABELS: Record<string, string> = {
  'null':     'Filter: show all',
  'maybe':    'Filter: maybe and must-see',
  'will_go':  'Filter: must-see only',
};

// ── StarFilterButton ──────────────────────────────────────────────────────────
// Presentational cycling button (null → maybe → will_go → null). No context
// dependency — wired by the caller (used inside the Lens panel level selector).

type StarFilterButtonProps = {
  value: ScopeLevel;
  onChange: (next: ScopeLevel) => void;
};

// Its own cycle rather than the interest one: 'dont_go' is not a filter level.
function nextLevel(level: ScopeLevel): ScopeLevel {
  switch (level) {
    case null: return 'maybe';
    case 'maybe': return 'will_go';
    case 'will_go': return null;
  }
}

export function StarFilterButton({ value, onChange }: StarFilterButtonProps) {
  const handlePress = useCallback((): void => {
    onChange(nextLevel(value));
  }, [value, onChange]);

  return (
    <StarButton
      status={value ?? 'none'}
      onPress={handlePress}
      label={INTEREST_FILTER_LABELS[String(value)]}
    />
  );
}
