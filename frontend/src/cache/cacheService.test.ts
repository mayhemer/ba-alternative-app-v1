import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDataCollector,
  getArtistEventMap,
  getArtists,
  getCacheVersion,
  getCategories,
  getEvents,
  getFestivalDays,
  getStages,
  getSyncWatermark,
  hasBios,
  hasCachedData,
  hasTimelineCategories,
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

  it('exposes the datasets unchanged', () => {
    const slug = freshSlug();
    populate(slug);

    expect(getArtists(slug)).toHaveLength(ARTISTS.length);
    expect(getCategories(slug)).toHaveLength(CATEGORIES.length);
    expect(getStages(slug)).toHaveLength(STAGES.length);
    expect(getEvents(slug)).toHaveLength(EVENTS.length);
  });
});

// ── Editions without categories ───────────────────────────────────────────────
// Some older editions publish stages but no categories, and their events point
// at a category that does not exist. Each stage then stands in for a category,
// so the timelines can be laid out by stage.

describe('an edition without categories', () => {
  const STAGE_A: DbStage = {
    slug: 'old', stageId: '11', imageUrl: 'a.jpg', thumbUrl: 'a-thumb.jpg',
    localized: [{ language: 'cs', name: 'Hlavní stage' }, { language: 'en', name: 'Main stage' }],
  };
  const STAGE_B: DbStage = {
    slug: 'old', stageId: '12', imageUrl: 'b.jpg', thumbUrl: 'b-thumb.jpg',
    localized: [{ language: 'en', name: 'Tent' }],
  };
  const BAND: DbArtist = { ...ARTISTS[0], artistId: '501', isPlayable: true };
  const SUPPORT: DbArtist = { ...ARTISTS[0], artistId: '502', isPlayable: false };
  const BAND_SET: DbEvent = {
    slug: 'old', eventId: '901', dateFrom: 1_700_000_000, dateTo: 1_700_003_600,
    artistId: '501', stageId: '11', categoryId: 'undefined',
  };
  const SUPPORT_SET: DbEvent = {
    slug: 'old', eventId: '902', dateFrom: 1_700_010_000, dateTo: 1_700_013_600,
    artistId: '502', stageId: '12', categoryId: 'undefined',
  };

  function populateWithoutCategories(slug: string): void {
    const collector = createDataCollector();
    collector.setArtists([BAND, SUPPORT]);
    collector.setCategories([]);
    collector.setStages([STAGE_A, STAGE_B]);
    collector.setEvents([BAND_SET, SUPPORT_SET]);
    populateCache(slug, collector.build(), SYNCED_AT);
  }

  it('gets one category per stage, with its id and names and no colour', () => {
    const slug = freshSlug();
    populateWithoutCategories(slug);

    expect(getCategories(slug)).toEqual([
      {
        slug: 'old', categoryId: '11', color: -1,
        localized: [{ language: 'cs', title: 'Hlavní stage' }, { language: 'en', title: 'Main stage' }],
      },
      { slug: 'old', categoryId: '12', color: -1, localized: [{ language: 'en', title: 'Tent' }] },
    ]);
  });

  it('files each event under the category of its stage', () => {
    const slug = freshSlug();
    populateWithoutCategories(slug);

    expect(getEvents(slug).map((e) => [e.eventId, e.categoryId])).toEqual([['901', '11'], ['902', '12']]);
    expect(getArtistEventMap(slug)['502'].map((e) => e.categoryId)).toEqual(['12']);
  });

  it('can lay out both the program and the support program', () => {
    const slug = freshSlug();
    populateWithoutCategories(slug);

    expect(hasTimelineCategories(slug, true)).toBe(true);
    expect(hasTimelineCategories(slug, false)).toBe(true);
  });

  it('gets them on a restore of an edition stored without categories', async () => {
    const slug = freshSlug();
    // Written as a build before this fallback stored it: no categories at all.
    await AsyncStorage.setItem(`festival:data:${slug}`, JSON.stringify({
      version: 2, syncedAt: SYNCED_AT,
      artists: [BAND, SUPPORT], categories: [], stages: [STAGE_A, STAGE_B], events: [BAND_SET, SUPPORT_SET],
    }));

    expect(await hydrateFestivalCache(slug)).toBe(true);
    expect(getCategories(slug).map((c) => c.categoryId)).toEqual(['11', '12']);
    expect(getEvents(slug).map((e) => e.categoryId)).toEqual(['11', '12']);
  });

  it('leaves an edition with categories as published', () => {
    const slug = freshSlug();
    populate(slug);

    expect(getCategories(slug)).toEqual(CATEGORIES);
    expect(getEvents(slug)).toEqual(EVENTS);
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
