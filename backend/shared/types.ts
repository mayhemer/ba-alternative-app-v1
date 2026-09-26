// DynamoDB item shapes — shared by both the API and sync lambdas

export interface DbArtistLocalized {
  language: string;
  name: string;
  content: string;
  genre: string;
  country: string;
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

/**
 * An artist as the list endpoint serves it: the stored shape minus the bio.
 * `content` is roughly three quarters of the artists payload, so the list stays
 * small enough to paint on and the bios follow separately — see DbArtistBios.
 */
export type DbArtistListItem = Omit<DbArtist, 'localized'> & {
  localized: Omit<DbArtistLocalized, 'content'>[];
};

/** One language's bio. */
export type DbArtistBio = Pick<DbArtistLocalized, 'language' | 'content'>;

/**
 * One artist's bios in the bulk GET /{slug}/bios response. The client fetches
 * the whole edition in one request, alongside the datasets rather than before
 * them, so the list paints immediately and every bio is still available offline.
 */
export type DbArtistBios = {
  artistId: string;
  localized: DbArtistBio[];
};

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

export interface DbSyncState {
  slug: string;
  tableName: string; // "artists" | "schedule"
  lastOfficialUpdate: number;
  lastSyncedAt: number;
  dataVersion: string;
}
