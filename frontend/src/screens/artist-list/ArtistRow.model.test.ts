import { artistRowModel } from './ArtistRow.model';
import type { DbArtist } from '../../types/backend';
import type { FriendPick } from '../../features/social/SocialContext';

// ── An artist row, as a model ─────────────────────────────────────────────────
//
// Dimensions: genre and country known or not (lineups arrive in waves); a
// thumbnail or none; friends who picked the artist or none; my pick.

function artist(overrides: Partial<DbArtist> = {}): DbArtist {
  return {
    slug: 't', artistId: 'a1', name: 'GOJIRA', isPlayable: true, imageUrl: '', thumbUrl: 'https://x/t.jpg', url: '',
    localized: [{ language: 'en', genre: 'Progressive death', country: 'France', bio: '' }],
    ...overrides,
  } as DbArtist;
}

describe('artistRowModel', () => {
  it('shows the name, genre, country, thumbnail and my pick', () => {
    expect(artistRowModel({ artist: artist(), status: 'maybe', friends: undefined })).toMatchObject({
      key: 'a1', name: 'GOJIRA', genre: 'Progressive death', country: 'France', thumbUrl: 'https://x/t.jpg', friends: [], status: 'maybe',
    });
  });

  it('leaves out a genre and a country not known yet', () => {
    const row = artistRowModel({ artist: artist({ localized: [] }), status: 'none', friends: undefined });
    expect([row.genre, row.country]).toEqual([null, null]);
  });

  it('draws the placeholder for an artist with no thumbnail', () => {
    expect(artistRowModel({ artist: artist({ thumbUrl: '' }), status: 'none', friends: undefined }).thumbUrl).toBeNull();
  });

  it('carries the friends who picked the artist', () => {
    const friends = [{ token: 't1', label: 'Anna', status: 'will_go' }] as unknown as FriendPick[];
    expect(artistRowModel({ artist: artist(), status: 'none', friends }).friends).toBe(friends);
  });
});
