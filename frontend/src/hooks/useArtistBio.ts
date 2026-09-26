import { useCallback, useEffect, useState } from 'react';
import { areBiosLoading, getArtistBio, hasBios } from '../cache/cacheService';
import { getArtistBioLocalized } from '../utils/localization';
import { useCacheRefresh } from '../store/AppContext';
import type { DbArtist } from '../types/backend';

/**
 * Why this is a state rather than a plain string: the bios are not part of the
 * artists payload, so at the moment a detail screen opens they may still be in
 * flight, or may have failed with no network. Collapsing all three cases to ''
 * renders "no bio" for an artist that has one, with nothing to tell the user
 * why — so the three are kept apart.
 */
export type ArtistBio =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'ready'; content: string };

export function useArtistBio(artist: DbArtist): ArtistBio {
  const { slug, artistId } = artist;

  const read = useCallback((): ArtistBio => {
    const localized = getArtistBio(slug, artistId);
    if (localized !== undefined) {
      return { state: 'ready', content: getArtistBioLocalized(localized) };
    }
    // Bios are loaded and this artist is not among them — it genuinely has none.
    if (hasBios(slug)) {
      return { state: 'ready', content: '' };
    }
    return areBiosLoading(slug) ? { state: 'loading' } : { state: 'unavailable' };
  }, [slug, artistId]);

  const [bio, setBio] = useState<ArtistBio>(read);

  // Re-reads when the sync service stores the bios or gives up on them, and
  // when the screen is pointed at a different artist.
  useCacheRefresh(useCallback(() => { setBio(read()); }, [read]));
  useEffect(() => { setBio(read()); }, [read]);

  return bio;
}
