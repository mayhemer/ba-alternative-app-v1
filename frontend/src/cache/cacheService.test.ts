import {
  createDataCollector,
  getArtistEventMap,
  getArtists,
  getCacheVersion,
  getCategories,
  getCategoryDayLayout,
  getEvents,
  getFestivalDays,
  getLayoutMap,
  getStages,
  getSyncWatermark,
  hasBios,
  hasCachedData,
  hydrateFestivalCache,
  invalidateBiosIfStale,
  populateCache,
  putArtistBios,
  setBiosLoading,
  subscribeToCache,
} from './cacheService';
import type { DbArtist, DbArtistBios, DbCategory, DbEvent, DbStage } from '../types/backend';

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Real captured API responses, normalized through the backend's own functions —
// see scripts/gen-fixtures.ts. Assertions below are relational against these
// rather than hardcoded literals, so refreshing the capture cannot break them.

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import categoriesFixture from '../../tests/fixtures/generated/ba2025/categories.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';
import biosFixture from '../../tests/fixtures/generated/ba2025/bios.json';

const ARTISTS = artistsFixture as unknown as DbArtist[];
const CATEGORIES = categoriesFixture as unknown as DbCategory[];
const STAGES = stagesFixture as unknown as DbStage[];
const EVENTS = scheduleFixture as unknown as DbEvent[];
const BIOS = biosFixture as unknown as DbArtistBios[];

const SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');

// The cache is module state keyed by slug, so each case takes its own edition
// rather than inheriting the previous one's.
let slugCounter = 0;
const freshSlug = (): string => `cachetest${++slugCounter}`;

function populate(slug: string, syncedAt = SYNCED_AT): void {
  const collector = createDataCollector();
  collector.setArtists(ARTISTS);
  collector.setCategories(CATEGORIES);
  collector.setStages(STAGES);
  collector.setEvents(EVENTS);
  populateCache(slug, collector.build(), syncedAt);
}

// ── Change notification ───────────────────────────────────────────────────────
// The invariant the cache store depends on: a component reading through
// useSyncExternalStore only re-renders because a write notified. A write path
// that forgets to is a silently stale UI — the class of bug this replaced.

describe('every write path notifies subscribers', () => {
  it('notifies on populateCache', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);

    populate(freshSlug());

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies on a restore from storage', async () => {
    const slug = freshSlug();
    populate(slug);

    // A second slug, hydrated from what the first write persisted, is the cold-start path.
    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);
    await hydrateFestivalCache(slug);

    // Already in memory, so nothing to announce — the short-circuit is deliberate.
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies when bios arrive', () => {
    const slug = freshSlug();
    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);

    putArtistBios(slug, BIOS, SYNCED_AT);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies when the bio loading flag changes', () => {
    const slug = freshSlug();
    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);

    setBiosLoading(slug, true);

    // A detail screen sitting on a spinner has to learn the answer changed.
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stays quiet when the bio loading flag is set to what it already is', () => {
    const slug = freshSlug();
    setBiosLoading(slug, true);

    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);
    setBiosLoading(slug, true);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies when stale bios are dropped', () => {
    const slug = freshSlug();
    putArtistBios(slug, BIOS, SYNCED_AT);

    const listener = jest.fn();
    const unsubscribe = subscribeToCache(listener);
    invalidateBiosIfStale(slug, SYNCED_AT + 1000);

    expect(listener).toHaveBeenCalled();
    expect(hasBios(slug)).toBe(false);
    unsubscribe();
  });

  it('leaves bios alone when only the schedule was rebuilt', () => {
    const slug = freshSlug();
    putArtistBios(slug, BIOS, SYNCED_AT);

    invalidateBiosIfStale(slug, SYNCED_AT);

    // The common case mid-festival: refetching every bio for it would be waste.
    expect(hasBios(slug)).toBe(true);
  });

  it('advances the version monotonically', () => {
    const before = getCacheVersion();
    populate(freshSlug());
    expect(getCacheVersion()).toBeGreaterThan(before);
  });

  it('stops notifying once unsubscribed', () => {
    const listener = jest.fn();
    subscribeToCache(listener)();

    populate(freshSlug());

    expect(listener).not.toHaveBeenCalled();
  });
});

// ── Snapshot identity ─────────────────────────────────────────────────────────
// useSyncExternalStore compares snapshots by identity. A getter that allocates
// on each read renders forever, so the "nothing cached" values must be shared.

describe('snapshot identity', () => {
  it('returns the same empty value on repeated reads of an unknown slug', () => {
    const slug = 'never-populated';

    expect(getArtists(slug)).toBe(getArtists(slug));
    expect(getCategories(slug)).toBe(getCategories(slug));
    expect(getStages(slug)).toBe(getStages(slug));
    expect(getEvents(slug)).toBe(getEvents(slug));
    expect(getFestivalDays(slug)).toBe(getFestivalDays(slug));
    expect(getArtistEventMap(slug)).toBe(getArtistEventMap(slug));
    expect(getLayoutMap(slug)).toBe(getLayoutMap(slug));
    expect(getCategoryDayLayout(slug, 'c1', 0)).toBe(getCategoryDayLayout(slug, 'c1', 0));
  });

  it('returns a stable reference for populated data too', () => {
    const slug = freshSlug();
    populate(slug);

    expect(getArtists(slug)).toBe(getArtists(slug));
    expect(getEvents(slug)).toBe(getEvents(slug));
  });

  it('changes the reference when new data arrives', () => {
    const slug = freshSlug();
    populate(slug);
    const before = getArtists(slug);

    // A genuinely different array, as a fresh fetch would produce — populateCache
    // keeps the caller's array identity, so handing it the same one back would
    // (correctly) look like no change at all.
    const collector = createDataCollector();
    collector.setArtists(ARTISTS.slice(0, 10));
    collector.setCategories(CATEGORIES);
    collector.setStages(STAGES);
    collector.setEvents(EVENTS);
    populateCache(slug, collector.build(), SYNCED_AT + 1000);

    // Compared as a boolean so a failure prints `true`, not 260 artists.
    expect(getArtists(slug) === before).toBe(false);
    expect(getArtists(slug)).toHaveLength(10);
  });
});

// ── Derived data ──────────────────────────────────────────────────────────────

describe('derived structures', () => {
  it('indexes every event under its artist', () => {
    const slug = freshSlug();
    populate(slug);

    const map = getArtistEventMap(slug);
    const indexed = Object.values(map).reduce((n, list) => n + list.length, 0);

    expect(indexed).toBe(EVENTS.length);
  });

  it('derives one festival day per distinct event day, in order', () => {
    const slug = freshSlug();
    populate(slug);

    const days = getFestivalDays(slug);

    expect(days.length).toBeGreaterThan(0);
    expect([...days]).toEqual([...days].sort((a, b) => a - b));
  });

  it('gives every event a sub-row within its category and day', () => {
    const slug = freshSlug();
    populate(slug);

    for (const [key, layout] of Object.entries(getLayoutMap(slug))) {
      expect(layout.subRowCount).toBeGreaterThanOrEqual(1);
      for (const subRow of Object.values(layout.eventSubRows)) {
        expect(subRow).toBeLessThan(layout.subRowCount);
        expect(subRow).toBeGreaterThanOrEqual(0);
      }
      expect(key).toMatch(/^.+_\d+$/);
    }
  });

  it('exposes the datasets unchanged', () => {
    const slug = freshSlug();
    populate(slug);

    expect(getArtists(slug)).toHaveLength(ARTISTS.length);
    expect(getCategories(slug)).toHaveLength(CATEGORIES.length);
    expect(getStages(slug)).toHaveLength(STAGES.length);
    expect(getEvents(slug)).toHaveLength(EVENTS.length);
  });
});

// ── Watermark ─────────────────────────────────────────────────────────────────

describe('the sync watermark', () => {
  it('is 0 for an edition with nothing cached', () => {
    expect(getSyncWatermark(freshSlug())).toBe(0);
  });

  it('is stored with the data it describes', () => {
    const slug = freshSlug();
    populate(slug);

    expect(getSyncWatermark(slug)).toBe(SYNCED_AT);
    expect(hasCachedData(slug)).toBe(true);
  });
});
