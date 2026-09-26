// Types mirrored from app/backend/shared/types.ts
// Keep in sync when the backend schema changes.

// Mirrors the backend's DbArtistListItem: the artists endpoint omits the bio,
// which is fetched per artist from /{slug}/artists/{artistId}/bio.
export interface DbArtistLocalized {
  language: string;
  name: string;
  genre: string;
  country: string;
}

/** One language's artist bio. */
export interface DbArtistBioLocalized {
  language: string;
  content: string;
}

/** One artist's bios, as the bulk /{slug}/bios response carries them. */
export interface DbArtistBios {
  artistId: string;
  localized: DbArtistBioLocalized[];
}

export interface DbArtist {
  slug: string;
  artistId: string;
  name: string;
  isPlayable: boolean;
  imageUrl: string;
  thumbUrl: string;
  url: string;
  localized: DbArtistLocalized[];
}

export interface DbStageLocalized {
  language: string;
  name: string;
}

export interface DbStage {
  slug: string;
  stageId: string;
  imageUrl: string;
  thumbUrl: string;
  localized: DbStageLocalized[];
}

export interface DbCategoryLocalized {
  language: string;
  title: string;
}

export interface DbCategory {
  slug: string;
  categoryId: string;
  color: number;
  localized: DbCategoryLocalized[];
}

export interface DbEvent {
  slug: string;
  eventId: string;
  dateFrom: number;
  dateTo: number;
  artistId: string;
  stageId: string;
  categoryId: string;
}

export interface DbUserInterest {
  userId: string;
  slugArtistId: string; // composite SK: "{slug}#{artistId}"
  status: 'will_go' | 'maybe' | 'none';
  updatedAt: number;
}

export interface DbShareToken {
  token: string;
  userId: string;
  slug: string;
  createdAt: number;
  label: string;        // sharer's display name, surfaced to the viewer
  avatarUrl?: string;   // optional profile picture (e.g. Google "picture" claim)
}
