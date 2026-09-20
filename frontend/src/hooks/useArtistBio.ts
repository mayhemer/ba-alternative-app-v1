import { useEffect, useState } from 'react';
import { baPublicApiAdapter } from '../adapters/baPublicApiAdapter';
import { getArtistBio, putArtistBio } from '../cache/cacheService';
import { getArtistBioLocalized } from '../utils/localization';
import type { DbArtist, DbArtistBioLocalized } from '../types/backend';

// In-flight fetches keyed `slug#artistId`. The detail screen mounts the header
// and the body separately and each remount would otherwise start its own
// request for the same bio.
const inFlight = new Map<string, Promise<DbArtistBioLocalized[]>>();

function fetchBioOnce(slug: string, artistId: string): Promise<DbArtistBioLocalized[]> {
  const key = `${slug}#${artistId}`;
  const pending = inFlight.get(key);
  if (pending !== undefined) {
    return pending;
  }

  const request = baPublicApiAdapter
    .fetchArtistBio(slug, artistId)
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/**
 * The artist's bio in the current language, or '' while it is still loading —
 * which is also what an artist without a bio returns, so the caller renders the
 * same "no bio" layout either way and the text simply appears once it arrives.
 *
 * Bios are not part of the artists payload; they are fetched per artist and
 * cached (and persisted) on first open.
 */
export function useArtistBio(artist: DbArtist): string {
  const { slug, artistId } = artist;
  const [bio, setBio] = useState<DbArtistBioLocalized[] | undefined>(
    () => getArtistBio(slug, artistId),
  );

  useEffect(() => {
    const cached = getArtistBio(slug, artistId);
    if (cached !== undefined) {
      setBio(cached);
      return;
    }

    let cancelled = false;
    setBio(undefined);

    fetchBioOnce(slug, artistId)
      .then((localized) => {
        putArtistBio(slug, artistId, localized);
        if (!cancelled) {
          setBio(localized);
        }
      })
      .catch(() => {
        // Offline, or the artist has no entry any more. The detail screen just
        // renders without a bio; the next open retries.
      });

    return () => { cancelled = true; };
  }, [slug, artistId]);

  return bio === undefined ? '' : getArtistBioLocalized(bio);
}
