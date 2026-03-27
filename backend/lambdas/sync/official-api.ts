// Official best4fest API client
// Base URL: https://admin.best4fest.app
// Changes:  GET /api/v2/{slug}/changes?time=0
// Artists:  GET /api/v3/{slug}/artists?time=0
// Schedule: GET /api/v3/{slug}/schedule?time=0

const BASE = 'https://admin.best4fest.app';

// ── Response shapes ──────────────────────────────────────────────────────────

export interface OfficialChangesEntry {
  id: number;
  table: string;
  time: number;
  count: number;
}

export interface OfficialArtistLocalized {
  id: number;
  language: string;
  name: string;
  content: string;
  genre: string;
  country: string;
  artist_id: number;
}

export interface OfficialArtist {
  id: number;
  name: string;
  url: string;
  facebook_url: string;
  youtube_url: string;
  image_url: string;
  thumb_url: string;
  is_playable: boolean;
  localized: OfficialArtistLocalized[];
}

export interface OfficialStageLocalized {
  id: number;
  language: string;
  name: string;
  stage_id: number;
}

export interface OfficialStage {
  id: number;
  image_url: string;
  thumb_url: string;
  latitude?: number;
  longitude?: number;
  localized: OfficialStageLocalized[];
}

export interface OfficialScheduleItem {
  id: number;
  date_from: number;
  date_to: number;
  stage_id: number;
  artist_id: number;
  schedule_category_id: number;
  stage: OfficialStage;
  artist: OfficialArtist;
}

export interface OfficialCategoryLocalized {
  id: number;
  language: string;
  title: string;
  schedule_category_id: number;
}

export interface OfficialCategory {
  id: number;
  color: number;
  localized: OfficialCategoryLocalized[];
}

export interface OfficialScheduleResponse {
  schedules: OfficialScheduleItem[];
  categories: OfficialCategory[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Official API error ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

export function fetchChanges(slug: string): Promise<OfficialChangesEntry[]> {
  return get(`/api/v2/${slug}/changes?time=0`);
}

export function fetchArtists(slug: string): Promise<OfficialArtist[]> {
  return get(`/api/v3/${slug}/artists?time=0`);
}

export function fetchSchedule(slug: string): Promise<OfficialScheduleResponse> {
  return get(`/api/v3/${slug}/schedule?time=0`);
}
