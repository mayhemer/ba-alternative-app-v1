import React, { createContext, useContext, useState } from 'react';
import type { DbArtist } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetailPresentationState = 'collapsed' | 'expanded';

type ArtistDetailState = {
  artist: DbArtist | null;
  presentation: DetailPresentationState;
};

type ArtistDetailContextValue = {
  detailState: ArtistDetailState;
  openDetail: (artist: DbArtist, presentation: DetailPresentationState) => void;
  closeDetail: () => void;
  expandDetail: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ArtistDetailContext = createContext<ArtistDetailContextValue | null>(null);

export function ArtistDetailProvider({ children }: { children: React.ReactNode }) {
  const [detailState, setDetailState] = useState<ArtistDetailState>({
    artist: null,
    presentation: 'collapsed',
  });

  function openDetail(artist: DbArtist, presentation: DetailPresentationState): void {
    setDetailState({ artist, presentation });
  }

  function closeDetail(): void {
    setDetailState({ artist: null, presentation: 'collapsed' });
  }

  function expandDetail(): void {
    setDetailState((prev) => ({ ...prev, presentation: 'expanded' }));
  }

  return (
    <ArtistDetailContext.Provider
      value={{ detailState, openDetail, closeDetail, expandDetail }}
    >
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
