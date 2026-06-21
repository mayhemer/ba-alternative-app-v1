// Types mirrored from app/backend/shared/types.ts
// Keep in sync when the backend schema changes.

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
