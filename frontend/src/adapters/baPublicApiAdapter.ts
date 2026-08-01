import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';
import type { DataCollector } from '../cache/cacheService';
import type { DataAdapter, ValidationResult } from './dataAdapter';

// ── Config ────────────────────────────────────────────────────────────────────

const API_ORIGIN = 'https://api.ba.janbambas.cz';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`);
  if (!response.ok) {
    throw new Error(`API error ${response.status} for ${path}`);
  }
  return response.json() as Promise<T>;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const baPublicApiAdapter: DataAdapter = {
  async validate(slug: string, since: number): Promise<ValidationResult> {
    type ValidityResponse = { changed: boolean; lastSyncedAt: number };
    const result = await apiFetch<ValidityResponse>(`/${slug}/validity/${since}`);
    // The endpoint answers `changed: lastSyncedAt > since`, so `lastSyncedAt` is
    // the value to carry forward as the next watermark.
    return { upToDate: !result.changed, serverSyncedAt: result.lastSyncedAt };
  },

  async populate(slug: string, collector: DataCollector): Promise<void> {
    const [artists, categories, stages, events] = await Promise.all([
      apiFetch<DbArtist[]>(`/${slug}/artists`),
      apiFetch<DbCategory[]>(`/${slug}/categories`),
      apiFetch<DbStage[]>(`/${slug}/stages`),
      apiFetch<DbEvent[]>(`/${slug}/schedule`),
    ]);

    collector.setArtists(artists);
    collector.setCategories(categories);
    collector.setStages(stages);
    collector.setEvents(events);
  },
};
