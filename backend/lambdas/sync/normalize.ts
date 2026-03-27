import type {
  OfficialArtist,
  OfficialStage,
  OfficialCategory,
  OfficialScheduleItem,
} from './official-api';
import type { DbArtist, DbStage, DbCategory, DbEvent } from '../../shared/types';

export function normalizeArtist(slug: string, a: OfficialArtist): DbArtist {
  return {
    slug,
    artistId: String(a.id),
    name: a.name,
    isPlayable: a.is_playable,
    imageUrl: a.image_url,
    thumbUrl: a.thumb_url,
    url: a.url || a.facebook_url || '',
    localized: a.localized.map(l => ({
      language: l.language,
      name: l.name,
      content: l.content ?? '',
      genre: l.genre ?? '',
      country: l.country ?? '',
    })),
  };
}

export function normalizeStage(slug: string, s: OfficialStage): DbStage {
  return {
    slug,
    stageId: String(s.id),
    imageUrl: s.image_url,
    thumbUrl: s.thumb_url,
    localized: s.localized.map(l => ({
      language: l.language,
      name: l.name,
    })),
  };
}

export function normalizeCategory(slug: string, c: OfficialCategory): DbCategory {
  return {
    slug,
    categoryId: String(c.id),
    color: c.color,
    localized: c.localized.map(l => ({
      language: l.language,
      title: l.title,
    })),
  };
}

export function normalizeEvent(slug: string, item: OfficialScheduleItem): DbEvent {
  return {
    slug,
    eventId: String(item.id),
    dateFrom: item.date_from,
    dateTo: item.date_to,
    artistId: String(item.artist_id),
    stageId: String(item.stage_id),
    categoryId: String(item.schedule_category_id),
  };
}

// Stages are embedded in each schedule item — extract the unique set
export function extractUniqueStages(items: OfficialScheduleItem[]): OfficialStage[] {
  const seen = new Map<number, OfficialStage>();
  for (const item of items) {
    if (!seen.has(item.stage.id)) {
      seen.set(item.stage.id, item.stage);
    }
  }
  return Array.from(seen.values());
}
