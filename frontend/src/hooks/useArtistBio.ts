import { useMemo } from 'react';
import { getArtistBioLocalized } from '../utils/localization';
import {
  useArtistBio as useCachedBio,
  useBiosLoading,
  useHasBios,
} from '../store/cacheStore';
import type { DbArtist } from '../types/backend';

/**
 * Why this is a tagged union rather than a plain string: the bios are not part
 * of the artists payload, so at the moment a detail screen opens they may still
 * be in flight, or may have failed with no network. Collapsing all three cases
 * to '' renders "no bio" for an artist that has one, with nothing to tell the
 * user why — so the three are kept apart.
 */
export type ArtistBio =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'ready'; content: string };

export function useArtistBio(artist: DbArtist): ArtistBio {
  const { slug, artistId } = artist;

  // All three reads subscribe to the cache, so the sync service storing the
  // bios — or giving up on them — re-renders this component on its own. The
  // result is derived here rather than mirrored into state by an effect: there
  // is no frame where it disagrees with the cache, and nothing to keep in step
  // when the screen is pointed at a different artist.
  const localized  = useCachedBio(slug, artistId);
  const biosLoaded = useHasBios(slug);
  const loading    = useBiosLoading(slug);

  return useMemo<ArtistBio>(() => {
    if (localized !== undefined) {
      return { state: 'ready', content: getArtistBioLocalized(localized) };
    }
    // Bios are loaded and this artist is not among them — it genuinely has none.
    if (biosLoaded) {
      return { state: 'ready', content: '' };
    }
    return loading ? { state: 'loading' } : { state: 'unavailable' };
  }, [localized, biosLoaded, loading]);
}
