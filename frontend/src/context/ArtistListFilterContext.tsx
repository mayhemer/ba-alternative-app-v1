import React, { createContext, useContext, useMemo, useState } from 'react';
import type { InterestStatus } from './InterestContext';

// Shared filter state for ArtistListScreen and its TopBar slot components.
// Scoped to ArtistListScreen — not global.

type ArtistListFilterContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  interestFilter: InterestStatus | null; // null = all, 'maybe' = maybe+must_see, 'must_see' = must_see only
  setInterestFilter: (f: InterestStatus | null) => void;
};

const ArtistListFilterContext = createContext<ArtistListFilterContextValue | null>(null);

export function ArtistListFilterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState<InterestStatus | null>(null);

  const value = useMemo(
    () => ({ searchQuery, setSearchQuery, interestFilter, setInterestFilter }),
    [searchQuery, interestFilter],
    // setSearchQuery and setInterestFilter are useState setters — stable by guarantee, omitted from deps
  );

  return (
    <ArtistListFilterContext.Provider value={value}>
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
