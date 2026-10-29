import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DbEvent } from '../../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConflictDetailState = {
  /** A set of the clash group shown; the sheet derives the whole group from it. */
  event: DbEvent | null;
};

type ConflictDetailContextValue = {
  conflictState: ConflictDetailState;
  openConflict: (event: DbEvent) => void;
  closeConflict: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ConflictDetailContext = createContext<ConflictDetailContextValue | null>(null);

export function ConflictDetailProvider({ children }: { children: React.ReactNode }) {
  const [conflictState, setConflictState] = useState<ConflictDetailState>({ event: null });

  const openConflict = useCallback((event: DbEvent): void => {
    setConflictState({ event });
  }, []);

  const closeConflict = useCallback((): void => {
    setConflictState({ event: null });
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
