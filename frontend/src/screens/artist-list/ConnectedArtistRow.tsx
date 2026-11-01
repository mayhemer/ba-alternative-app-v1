import React from 'react';
import type { DbArtist } from '../../types/backend';
import type { FriendPick } from '../../features/social/SocialContext';
import { useInterestStatus } from '../../features/interests/InterestContext';
import { ArtistRow } from './ArtistRow';
import { artistRowModel } from './ArtistRow.model';

// ── An artist row, bound to its pick ──────────────────────────────────────────
//
// What the list renders for each artist. It reads its own artist's pick, so a
// star press renders this row alone, and the list above it not at all. The row
// it draws (ArtistRow) still gets its model from the raw inputs, built here in
// one place.

type Props = {
  artist: DbArtist;
  /** Friends who picked the artist; undefined when none did. */
  friends: FriendPick[] | undefined;
  onPress: (artist: DbArtist) => void;
};

function ConnectedArtistRowBase({ artist, friends, onPress }: Props) {
  const status = useInterestStatus(artist.artistId);
  return <ArtistRow item={artistRowModel({ artist, status, friends })} onPress={onPress} />;
}

export const ConnectedArtistRow = React.memo(ConnectedArtistRowBase);
