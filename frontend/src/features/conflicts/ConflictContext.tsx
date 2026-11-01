import React, { createContext, useContext, useMemo } from 'react';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useStages } from '../../store/cacheStore';
import { useDeferredInterests } from '../interests/InterestContext';
import { useStableValue } from '../../hooks/useStableValue';
import { equalValues } from '../../ui/sameProps';
import { computeConflictEntries, conflictOverlapsOf } from '../../lib/conflictUtils';
import type { Conflicts } from '../../lib/conflictUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

/** The one conflict calculation the whole app follows: the timelines, My plan, the sheets, the drawer. */
type ConflictContextValue = Conflicts & {
  count: number;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ConflictContext = createContext<ConflictContextValue | null>(null);

export function ConflictProvider({ children }: { children: React.ReactNode }) {
  const selectedSlug = useSelectedSlug();
  // Deferred: a star press draws the star first; the conflicts (the drawer's
  // count, the sheets) follow in a render of their own that a next tap can
  // interrupt. Everything else that follows a pick reads the same deferred picks.
  const interests = useDeferredInterests();

  // Reading through these hooks subscribes the provider to the cache, so a
  // background sync re-renders it; and because they are real values, the memo
  // below has honest dependencies — no change counter, no exhaustive-deps
  // suppression.
  const artists      = useArtists(selectedSlug);
  const stages       = useStages(selectedSlug);
  const artistEvents = useArtistEventMap(selectedSlug);

  const computed = useMemo(
    () => computeConflictEntries(interests, { artists, stages, artistEvents }),
    [interests, artists, stages, artistEvents],
  );
  // Most picks make or end no clash: the same list then, so nobody reading the
  // conflicts renders for it.
  const entries = useStableValue(computed, equalValues);

  const value = useMemo<ConflictContextValue>(
    () => ({ entries, count: entries.length, overlaps: conflictOverlapsOf(entries) }),
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
