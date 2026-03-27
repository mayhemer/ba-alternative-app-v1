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
  status: 'will_go' | 'maybe';
  updatedAt: number;
}

export interface DbShareToken {
  token: string;
  userId: string;
  slug: string;
  createdAt: number;
}

export interface DbSyncState {
  slug: string;
  tableName: string; // "artists" | "schedule"
  lastOfficialUpdate: number;
  lastSyncedAt: number;
  dataVersion: string;
}
