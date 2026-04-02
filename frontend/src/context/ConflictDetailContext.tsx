import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DbEvent } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConflictDetailState = {
  sourceEvent: DbEvent | null;
  overlappingEvents: DbEvent[];
};

type ConflictDetailContextValue = {
  conflictState: ConflictDetailState;
  openConflict: (sourceEvent: DbEvent, overlappingEvents: DbEvent[]) => void;
  closeConflict: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ConflictDetailContext = createContext<ConflictDetailContextValue | null>(null);

export function ConflictDetailProvider({ children }: { children: React.ReactNode }) {
  const [conflictState, setConflictState] = useState<ConflictDetailState>({
    sourceEvent: null,
    overlappingEvents: [],
  });

  const openConflict = useCallback((sourceEvent: DbEvent, overlappingEvents: DbEvent[]): void => {
    setConflictState({ sourceEvent, overlappingEvents });
  }, []);

  const closeConflict = useCallback((): void => {
    setConflictState({ sourceEvent: null, overlappingEvents: [] });
  }, []);

  const value = useMemo(
    () => ({ conflictState, openConflict, closeConflict }),
    [conflictState, openConflict, closeConflict],
  );

  return (
    <ConflictDetailContext.Provider value={value}>
      {children}
    </ConflictDetailContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConflictDetail(): ConflictDetailContextValue {
  const ctx = useContext(ConflictDetailContext);
  if (ctx === null) {
    throw new Error('useConflictDetail must be used inside ConflictDetailProvider');
  }
  return ctx;
}
