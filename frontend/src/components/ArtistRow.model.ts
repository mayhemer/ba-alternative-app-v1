import type { DbArtist } from '../types/backend';
import type { InterestStatus } from '../context/InterestContext';
import type { FriendPick } from '../context/SocialContext';
import { getArtistLocalized } from '../utils/localization';

// ── An artist row: what it shows ──────────────────────────────────────────────
//
// From the artist, my pick and the friends who picked them: the name, the genre
// and the country (each only when known — lineups arrive in waves), the
// thumbnail or a placeholder, the friends' facepile, and the star.

export type ArtistRowModel = {
  /** The artistId. */
  key: string;
  /** Handed back on a tap. */
  artist: DbArtist;
  name: string;
  genre: string | null;
  country: string | null;
  /** Null: draw the placeholder, never an image with an empty URL. */
  thumbUrl: string | null;
  /** Friends who picked the artist; the facepile shows only when there are some. */
  friends: FriendPick[];
  status: InterestStatus;
};

const NO_FRIENDS: FriendPick[] = [];

export function artistRowModel({ artist, status, friends }: { artist: DbArtist; status: InterestStatus; friends: FriendPick[] | undefined }): ArtistRowModel {
  const genre = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  return {
    key: artist.artistId,
    artist,
    name: artist.name,
    genre: genre !== '' ? genre : null,
    country: country !== '' ? country : null,
    thumbUrl: artist.thumbUrl !== '' ? artist.thumbUrl : null,
    friends: friends ?? NO_FRIENDS,
    status,
  };
}
