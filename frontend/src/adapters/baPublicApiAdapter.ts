import type { DbArtist, DbCategory, DbEvent, DbStage } from '../types/backend';
import type { DataCollector } from '../cache/cacheService';
import type { DataAdapter } from './dataAdapter';

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
  async validate(slug: string, lastSyncTime: number): Promise<boolean> {
    type ValidityResponse = { changed: boolean; lastSyncedAt: number };
    const result = await apiFetch<ValidityResponse>(
      `/${slug}/validity/${lastSyncTime}`,
    );
    // true = up-to-date (no fetch needed), false = data changed
    return !result.changed;
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
