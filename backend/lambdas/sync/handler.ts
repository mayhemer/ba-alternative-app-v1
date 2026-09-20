import type { ScheduledEvent } from 'aws-lambda';
import { fetchChanges, fetchArtists, fetchSchedule } from './official-api';
import {
  normalizeArtist,
  normalizeStage,
  normalizeCategory,
  normalizeEvent,
  extractUniqueStages,
} from './normalize';
import {
  batchPut,
  batchDelete,
  queryAllKeys,
  getSyncState,
  putSyncState,
} from './db';
import { invalidatePaths } from './cloudfront';

// ── Config from environment (read lazily so tests can set process.env) ────────

type Config = ReturnType<typeof getConfig>;

function getConfig() {
  const env = process.env as Record<string, string>;
  return {
    slugs: activeSlugs(env.FESTIVAL_SLUGS ?? '', Date.now()),
    tables: {
      artists:    env.ARTISTS_TABLE,
      stages:     env.STAGES_TABLE,
      categories: env.CATEGORIES_TABLE,
      events:     env.EVENTS_TABLE,
      syncState:  env.SYNC_STATE_TABLE,
    },
    cloudfrontId: env.CLOUDFRONT_DISTRIBUTION_ID ?? '',
  };
}

// Official /changes table names that map to our two sync groups
const ARTISTS_OFFICIAL_TABLES = new Set(['db_artist', 'db_artist_localized']);
const SCHEDULE_OFFICIAL_TABLES = new Set([
  'db_schedule',
  'db_schedule_category',
  'db_schedule_category_localized',
  'db_stage',
  'db_stage_localized',
]);

/**
 * Parses FESTIVAL_SLUGS and keeps only the editions still worth polling.
 *
 * Each entry is either `slug` or `slug:<ISO end timestamp>`. A dated entry
 * drops out once its edition has ended — the official data for a finished
 * festival never changes again, so polling it only burns requests against the
 * official API. An undated entry is always synced.
 */
export function activeSlugs(raw: string, now: number): string[] {
  const slugs: string[] = [];

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (trimmed === '') {
      continue;
    }

    // Split on the FIRST colon only — the ISO timestamp contains colons too.
    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      slugs.push(trimmed);
      continue;
    }

    const slug = trimmed.slice(0, separator).trim();
    if (slug === '') {
      continue;
    }

    const endsAt = Date.parse(trimmed.slice(separator + 1).trim());
    if (Number.isNaN(endsAt)) {
      console.warn(`[${slug}] unparsable end date in FESTIVAL_SLUGS — syncing anyway`);
      slugs.push(slug);
      continue;
    }

    if (now <= endsAt) {
      slugs.push(slug);
    }
  }

  return slugs;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function handler(_event: ScheduledEvent): Promise<void> {
  const config = getConfig();

  if (config.slugs.length === 0) {
    console.warn('FESTIVAL_SLUGS is not configured — nothing to sync');
    return;
  }

  console.log(`Sync started for slugs: ${config.slugs.join(', ')}`);

  for (const slug of config.slugs) {
    try {
      await syncSlug(slug, config);
    } catch (err) {
      // Log and continue — one failed slug should not block others
      console.error(`Sync failed for slug "${slug}":`, err);
    }
  }

  console.log('Sync run complete');
}

// ── Per-slug sync ─────────────────────────────────────────────────────────────

async function syncSlug(slug: string, config: Config): Promise<void> {
  // 1. Fetch current timestamps from official /changes
  const changes = await fetchChanges(slug);
  const timeByTable = new Map(changes.map(c => [c.table, c.time]));

  const artistsOfficialTime = maxTime(timeByTable, ARTISTS_OFFICIAL_TABLES);
  const scheduleOfficialTime = maxTime(timeByTable, SCHEDULE_OFFICIAL_TABLES);

  // 2. Compare against our last sync timestamps
  const syncStateMap = await getSyncState(config.tables.syncState, slug);
  const artistsLastSynced = syncStateMap.get('artists')?.lastSyncedAt ?? 0;
  const scheduleLastSynced = syncStateMap.get('schedule')?.lastSyncedAt ?? 0;

  const artistsDirty = artistsOfficialTime > artistsLastSynced;
  const scheduleDirty = scheduleOfficialTime > scheduleLastSynced;

  if (!artistsDirty && !scheduleDirty) {
    console.log(`[${slug}] Up to date, skipping`);
    return;
  }

  const invalidationPaths: string[] = [];
  const now = Date.now();

  // 3a. Rebuild artists if dirty
  if (artistsDirty) {
    console.log(`[${slug}] Artists dirty — rebuilding`);
    const officialArtists = await fetchArtists(slug);
    const newItems = officialArtists.map(a => normalizeArtist(slug, a));
    await rebuildTable(config.tables.artists, slug, 'artistId', newItems);
    await putSyncState(config.tables.syncState, {
      slug,
      tableName: 'artists',
      lastOfficialUpdate: artistsOfficialTime,
      lastSyncedAt: now,
      dataVersion: String(now),
    });
    // The trailing wildcard covers the per-artist bio paths; CloudFront bills a
    // wildcard as a single path.
    invalidationPaths.push(`/${slug}/artists`, `/${slug}/artists/*`);
    console.log(`[${slug}] Artists rebuilt — ${newItems.length} items`);
  }

  // 3b. Rebuild schedule (events + stages + categories) if dirty
  if (scheduleDirty) {
    console.log(`[${slug}] Schedule dirty — rebuilding`);
    const { schedules, categories } = await fetchSchedule(slug);

    const newStages = extractUniqueStages(schedules).map(s => normalizeStage(slug, s));
    const newCategories = categories.map(c => normalizeCategory(slug, c));
    const newEvents = schedules.map(item => normalizeEvent(slug, item));

    // Rebuild all three tables derived from the schedule endpoint
    await Promise.all([
      rebuildTable(config.tables.stages, slug, 'stageId', newStages),
      rebuildTable(config.tables.categories, slug, 'categoryId', newCategories),
      rebuildTable(config.tables.events, slug, 'eventId', newEvents),
    ]);

    await putSyncState(config.tables.syncState, {
      slug,
      tableName: 'schedule',
      lastOfficialUpdate: scheduleOfficialTime,
      lastSyncedAt: now,
      dataVersion: String(now),
    });

    invalidationPaths.push(`/${slug}/schedule`, `/${slug}/categories`, `/${slug}/stages`);
    console.log(
      `[${slug}] Schedule rebuilt — ${newEvents.length} events, ${newStages.length} stages, ${newCategories.length} categories`,
    );
  }

  // 4. Invalidate CloudFront for affected paths
  if (invalidationPaths.length > 0 && config.cloudfrontId) {
    await invalidatePaths(config.cloudfrontId, invalidationPaths);
    console.log(`[${slug}] CloudFront invalidated: ${invalidationPaths.join(', ')}`);
  }
}

// ── Full-rebuild helper ───────────────────────────────────────────────────────

// Writes all new items (upsert), then deletes any items that are no longer present.
// Runs the initial query and the writes in parallel so there is no read-outage window.
async function rebuildTable(
  tableName: string,
  slug: string,
  skName: string,
  newItems: object[],
): Promise<void> {
  const [existingKeys] = await Promise.all([
    queryAllKeys(tableName, slug, skName),
    batchPut(tableName, newItems),
  ]);

  const newSkSet = new Set(newItems.map(item => String((item as Record<string, unknown>)[skName])));
  const keysToDelete = existingKeys.filter(k => !newSkSet.has(String(k[skName])));
  if (keysToDelete.length > 0) {
    await batchDelete(tableName, keysToDelete);
    console.log(`[${tableName}] Deleted ${keysToDelete.length} stale items`);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function maxTime(timeByTable: Map<string, number>, tableNames: Set<string>): number {
  let max = 0;
  for (const name of tableNames) {
    const t = timeByTable.get(name) ?? 0;
    if (t > max) max = t;
  }
  return max;
}
