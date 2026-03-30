import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DbArtist, DbCategory, DbEvent } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetailPresentationState = 'collapsed' | 'expanded';

export type DetailEvent = {
  event: DbEvent;
  category: DbCategory;
};

type ArtistDetailState = {
  artist: DbArtist | null;
  detailEvent: DetailEvent | null;
  presentation: DetailPresentationState;
};

type ArtistDetailContextValue = {
  detailState: ArtistDetailState;
  openDetail: (artist: DbArtist, presentation: DetailPresentationState, detailEvent?: DetailEvent) => void;
  closeDetail: () => void;
  expandDetail: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ArtistDetailContext = createContext<ArtistDetailContextValue | null>(null);

export function ArtistDetailProvider({ children }: { children: React.ReactNode }) {
  const [detailState, setDetailState] = useState<ArtistDetailState>({
    artist: null,
    detailEvent: null,
    presentation: 'collapsed',
  });

  const openDetail = useCallback((artist: DbArtist, presentation: DetailPresentationState, detailEvent?: DetailEvent): void => {
    setDetailState({ artist, detailEvent: detailEvent ?? null, presentation });
  }, []);

  const closeDetail = useCallback((): void => {
    setDetailState({ artist: null, detailEvent: null, presentation: 'collapsed' });
  }, []);

  const expandDetail = useCallback((): void => {
    setDetailState((prev) => ({ ...prev, presentation: 'expanded' }));
  }, []);

  const value = useMemo(
    () => ({ detailState, openDetail, closeDetail, expandDetail }),
    [detailState, openDetail, closeDetail, expandDetail],
  );

  return (
    <ArtistDetailContext.Provider value={value}>
      {children}
    </ArtistDetailContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArtistDetail(): ArtistDetailContextValue {
  const ctx = useContext(ArtistDetailContext);
  if (ctx === null) {
    throw new Error('useArtistDetail must be used inside ArtistDetailProvider');
  }
  return ctx;
}
