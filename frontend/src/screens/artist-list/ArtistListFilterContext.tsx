import React, { createContext, useContext, useMemo, useState } from 'react';

// Shared filter state for ArtistListScreen and its TopBar slot components.
// Scoped to ArtistListScreen — not global. Interest filtering now lives in the
// global LensContext; this only carries the search query.

type ArtistListFilterContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const ArtistListFilterContext = createContext<ArtistListFilterContextValue | null>(null);

export function ArtistListFilterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');

  const value = useMemo(
    () => ({ searchQuery, setSearchQuery }),
    [searchQuery],
    // setSearchQuery is a useState setter — stable by guarantee, omitted from deps
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
