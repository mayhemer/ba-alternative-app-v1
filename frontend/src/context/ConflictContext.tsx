import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useCacheRefresh, useSelectedSlug } from '../store/AppContext';
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
  const [revision, setRevision] = useState(0);

  useCacheRefresh(useCallback(() => setRevision((r) => r + 1), []));

  // `revision` is intentionally a dependency even though it is not read inside
  // the callback: it bumps on cache refresh to force a recompute against the
  // freshly-populated festival cache (which computeConflictEntries reads directly).
  const entries = useMemo(
    () => computeConflictEntries(selectedSlug, interests),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSlug, interests, revision],
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
