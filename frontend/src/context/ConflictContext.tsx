import React, { createContext, useContext, useMemo } from 'react';
import { useSelectedSlug } from '../store/AppContext';
import { useArtistEventMap, useArtists, useStages } from '../store/cacheStore';
import { useInterest } from './InterestContext';
import { computeConflictEntries } from '../utils/conflictUtils';
import type { ConflictEntry } from '../utils/conflictUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConflictContextValue = {
  entries: ConflictEntry[];
  count: number;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ConflictContext = createContext<ConflictContextValue | null>(null);

export function ConflictProvider({ children }: { children: React.ReactNode }) {
  const selectedSlug = useSelectedSlug();
  const { interests } = useInterest();

  // Reading through these hooks subscribes the provider to the cache, so a
  // background sync re-renders it; and because they are real values, the memo
  // below has honest dependencies — no change counter, no exhaustive-deps
  // suppression.
  const artists      = useArtists(selectedSlug);
  const stages       = useStages(selectedSlug);
  const artistEvents = useArtistEventMap(selectedSlug);

  const entries = useMemo(
    () => computeConflictEntries(interests, { artists, stages, artistEvents }),
    [interests, artists, stages, artistEvents],
  );

  const value = useMemo<ConflictContextValue>(
    () => ({ entries, count: entries.length }),
    [entries],
  );

  return <ConflictContext.Provider value={value}>{children}</ConflictContext.Provider>;
}

export function useConflicts(): ConflictContextValue {
  const ctx = useContext(ConflictContext);
  if (ctx === null) {
    throw new Error('useConflicts must be used inside ConflictProvider');
  }
  return ctx;
}
