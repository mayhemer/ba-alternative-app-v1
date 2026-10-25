import type { DbArtist } from '../../types/backend';

// ── The artist sheet's links: what they show ──────────────────────────────────
//
// For a band, searches for its name on the streaming and reference sites; for
// any artist with a web page, its domain as a chip. The row is there for a band
// or for any artist with a URL.

export type StreamingSite = 'spotify' | 'tidal' | 'metal-archives' | 'setlist-fm';

export type ArtistLinksModel = {
  shown: boolean;
  streaming: { site: StreamingSite; url: string }[];
  /** The artist's own page, as its domain without "www."; null without a valid URL. */
  web: { url: string; domain: string } | null;
};

function domainOf(url: string): string | null {
  if (url === '') {
    return null;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return null;
  }
}

export function artistLinksModel(artist: DbArtist): ArtistLinksModel {
  const name = encodeURIComponent(artist.name.toLocaleLowerCase());
  const domain = domainOf(artist.url);
  return {
    shown: artist.isPlayable || artist.url !== '',
    streaming: artist.isPlayable
      ? [
          { site: 'spotify', url: `https://open.spotify.com/search/${name}` },
          { site: 'tidal', url: `https://tidal.com/search?q=${name}` },
          { site: 'metal-archives', url: `https://www.metal-archives.com/search?searchString=${name}&type=band_name` },
          { site: 'setlist-fm', url: `https://www.setlist.fm/search?query=${name}` },
        ]
      : [],
    web: domain !== null ? { url: artist.url, domain } : null,
  };
}
