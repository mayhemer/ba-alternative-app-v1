import React, { createContext, useContext, useState } from 'react';
import type { InterestStatus } from './InterestContext';

// Shared filter state for ArtistListScreen and its TopBar slot components.
// Scoped to ArtistListScreen — not global.

type ArtistListFilterContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  interestFilter: InterestStatus | null; // null = show all
  setInterestFilter: (f: InterestStatus | null) => void;
};

const ArtistListFilterContext = createContext<ArtistListFilterContextValue | null>(null);

export function ArtistListFilterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState<InterestStatus | null>(null);

  return (
    <ArtistListFilterContext.Provider
      value={{ searchQuery, setSearchQuery, interestFilter, setInterestFilter }}
    >
      {children}
    </ArtistListFilterContext.Provider>
  );
}

export function useArtistListFilter(): ArtistListFilterContextValue {
  const ctx = useContext(ArtistListFilterContext);
  if (ctx === null) {
    throw new Error('useArtistListFilter must be used inside ArtistListFilterProvider');
  }
  return ctx;
}
