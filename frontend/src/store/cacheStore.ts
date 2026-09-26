import { useSyncExternalStore } from 'react';
import {
  areBiosLoading,
  getArtistBio,
  getArtistEventMap,
  getArtistEvents,
  getArtists,
  getCacheVersion,
  getCategories,
  getEvents,
  getFestivalDays,
  getLayoutMap,
  getStages,
  hasBios,
  subscribeToCache,
} from '../cache/cacheService';
import type {
  DbArtistEventMap, DbFestivalDays, DbLayoutMap,
} from '../cache/cacheService';
import type {
  DbArtist, DbArtistBioLocalized, DbCategory, DbEvent, DbStage,
} from '../types/backend';

// ── React binding for the festival cache ──────────────────────────────────────
//
// The cache is a plain module outside React (cache/cacheService.ts). These hooks
// are the only sanctioned way to read it from a component, and each one
// subscribes as a side effect of reading — so a component physically cannot
// consume cached data without being re-rendered when that data changes.
//
// This replaces the old opt-in emitter (`useCacheRefresh`), which most readers
// simply never called; they were correct only because a subscribed parent
// happened to re-render them, and stopped being correct the moment that
// coincidence broke.
//
// Every getter below returns a referentially stable value between mutations —
// see the EMPTY_* constants in cacheService. That is a hard requirement of
// useSyncExternalStore: a snapshot that allocates on each read re-renders
// forever.

/**
 * Subscribes to the cache and returns whatever `getSnapshot` reads from it.
 *
 * `getSnapshot` MUST return a referentially stable value while the cache is
 * unchanged — a cacheService getter, or a value derived from one without
 * allocating. To derive something that does allocate (a Map, a sorted array),
 * read the inputs with the hooks below and compute in a `useMemo` over them,
 * so the memo's dependencies are the real data rather than a change counter.
 */
export function useCacheSnapshot<T>(getSnapshot: () => T): T {
  return useSyncExternalStore(subscribeToCache, getSnapshot, getSnapshot);
}

/**
 * The cache's monotonic version. Prefer the typed hooks below; this exists for
 * the rare reader that genuinely needs the change signal itself rather than a
 * value, and it is deliberately not a general escape hatch for `useMemo` deps.
 */
export function useCacheVersion(): number {
  return useCacheSnapshot(getCacheVersion);
}

export function useArtists(slug: string): DbArtist[] {
  return useCacheSnapshot(() => getArtists(slug));
}

export function useCategories(slug: string): DbCategory[] {
  return useCacheSnapshot(() => getCategories(slug));
}

export function useStages(slug: string): DbStage[] {
  return useCacheSnapshot(() => getStages(slug));
}

export function useEvents(slug: string): DbEvent[] {
  return useCacheSnapshot(() => getEvents(slug));
}

export function useFestivalDays(slug: string): DbFestivalDays {
  return useCacheSnapshot(() => getFestivalDays(slug));
}

export function useArtistEvents(slug: string, artistId: string): DbEvent[] {
  return useCacheSnapshot(() => getArtistEvents(slug, artistId));
}

export function useArtistEventMap(slug: string): DbArtistEventMap {
  return useCacheSnapshot(() => getArtistEventMap(slug));
}

export function useLayoutMap(slug: string): DbLayoutMap {
  return useCacheSnapshot(() => getLayoutMap(slug));
}

export function useArtistBio(
  slug: string,
  artistId: string,
): DbArtistBioLocalized[] | undefined {
  return useCacheSnapshot(() => getArtistBio(slug, artistId));
}

/** True once this edition's bios are cached, whether or not any artist has one. */
export function useHasBios(slug: string): boolean {
  return useCacheSnapshot(() => hasBios(slug));
}

/** True while a bulk bio fetch for this edition is running. */
export function useBiosLoading(slug: string): boolean {
  return useCacheSnapshot(() => areBiosLoading(slug));
}
