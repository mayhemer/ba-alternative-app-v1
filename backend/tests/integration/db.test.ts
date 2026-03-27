// Layer 3 — Integration tests for db.ts
//
// Runs against an in-memory DynamoDB instance (dynalite) started by
// jest-dynalite. Tables are created fresh before each file and cleared after
// each test. No mocks — every assertion goes through the real AWS SDK.

import {
  batchPut,
  batchDelete,
  queryAllKeys,
  getSyncState,
  putSyncState,
  closeDbClient,
} from '../../lambdas/sync/db';
import type { DbSyncState } from '../../shared/types';

const ARTISTS  = 'ba-artists';
const STAGES   = 'ba-stages';
const SYNC     = 'ba-sync-state';

afterAll(() => closeDbClient());

// ── batchPut + queryAllKeys ───────────────────────────────────────────────────

describe('batchPut + queryAllKeys', () => {
  it('written items are returned by queryAllKeys', async () => {
    const items = [
      { slug: 'ba2025', artistId: '1', name: 'Band A' },
      { slug: 'ba2025', artistId: '2', name: 'Band B' },
    ];
    await batchPut(ARTISTS, items);

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(2);
    expect(keys.map(k => k['artistId']).sort()).toEqual(['1', '2']);
  });

  it('items from different slugs do not appear in each other\'s query', async () => {
    await batchPut(ARTISTS, [
      { slug: 'ba2025', artistId: '10', name: 'Only 2025' },
      { slug: 'ba2024', artistId: '10', name: 'Only 2024' },
    ]);

    const keys25 = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    const keys24 = await queryAllKeys(ARTISTS, 'ba2024', 'artistId');

    expect(keys25).toHaveLength(1);
    expect(keys25[0]['slug']).toBe('ba2025');
    expect(keys24).toHaveLength(1);
    expect(keys24[0]['slug']).toBe('ba2024');
  });

  it('queryAllKeys returns empty array when table has no items for slug', async () => {
    const keys = await queryAllKeys(ARTISTS, 'ba2099', 'artistId');
    expect(keys).toEqual([]);
  });

  it('batchPut is idempotent — re-writing same key overwrites the item', async () => {
    await batchPut(ARTISTS, [{ slug: 'ba2025', artistId: '5', name: 'Original' }]);
    await batchPut(ARTISTS, [{ slug: 'ba2025', artistId: '5', name: 'Updated' }]);

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(1);
  });

  it('handles a batch larger than 25 items (chunking)', async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      slug: 'ba2025',
      artistId: String(i + 1),
      name: `Band ${i + 1}`,
    }));
    await batchPut(ARTISTS, items);

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(60);
  });
});

// ── batchDelete ───────────────────────────────────────────────────────────────

describe('batchDelete', () => {
  it('deleted items no longer appear in queryAllKeys', async () => {
    await batchPut(ARTISTS, [
      { slug: 'ba2025', artistId: '1', name: 'A' },
      { slug: 'ba2025', artistId: '2', name: 'B' },
      { slug: 'ba2025', artistId: '3', name: 'C' },
    ]);

    await batchDelete(ARTISTS, [
      { slug: 'ba2025', artistId: '1' },
      { slug: 'ba2025', artistId: '3' },
    ]);

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(1);
    expect(keys[0]['artistId']).toBe('2');
  });

  it('deleting a non-existent key is a no-op', async () => {
    await batchPut(ARTISTS, [{ slug: 'ba2025', artistId: '1', name: 'A' }]);
    await expect(
      batchDelete(ARTISTS, [{ slug: 'ba2025', artistId: 'ghost' }]),
    ).resolves.toBeUndefined();

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(1);
  });

  it('handles a delete batch larger than 25 items (chunking)', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      slug: 'ba2025',
      artistId: String(i),
      name: `Band ${i}`,
    }));
    await batchPut(ARTISTS, items);
    await batchDelete(ARTISTS, items.map(({ slug, artistId }) => ({ slug, artistId })));

    const keys = await queryAllKeys(ARTISTS, 'ba2025', 'artistId');
    expect(keys).toHaveLength(0);
  });
});

// ── getSyncState + putSyncState ───────────────────────────────────────────────

describe('getSyncState + putSyncState', () => {
  it('returns empty map when no sync state exists', async () => {
    const map = await getSyncState(SYNC, 'ba2025');
    expect(map.size).toBe(0);
  });

  it('written sync state is readable back as-is', async () => {
    const state: DbSyncState = {
      slug: 'ba2025',
      tableName: 'artists',
      lastOfficialUpdate: 1_000_000,
      lastSyncedAt: 2_000_000,
      dataVersion: 'v1',
    };
    await putSyncState(SYNC, state);

    const map = await getSyncState(SYNC, 'ba2025');
    expect(map.size).toBe(1);
    expect(map.get('artists')).toMatchObject(state);
  });

  it('stores multiple table entries under the same slug', async () => {
    await putSyncState(SYNC, {
      slug: 'ba2025', tableName: 'artists',
      lastOfficialUpdate: 1000, lastSyncedAt: 1000, dataVersion: '',
    });
    await putSyncState(SYNC, {
      slug: 'ba2025', tableName: 'schedule',
      lastOfficialUpdate: 2000, lastSyncedAt: 2000, dataVersion: '',
    });

    const map = await getSyncState(SYNC, 'ba2025');
    expect(map.size).toBe(2);
    expect(map.has('artists')).toBe(true);
    expect(map.has('schedule')).toBe(true);
  });

  it('sync state for different slugs is isolated', async () => {
    await putSyncState(SYNC, {
      slug: 'ba2025', tableName: 'artists',
      lastOfficialUpdate: 1000, lastSyncedAt: 1000, dataVersion: '',
    });
    await putSyncState(SYNC, {
      slug: 'ba2024', tableName: 'artists',
      lastOfficialUpdate: 9000, lastSyncedAt: 9000, dataVersion: '',
    });

    const map25 = await getSyncState(SYNC, 'ba2025');
    const map24 = await getSyncState(SYNC, 'ba2024');

    expect(map25.get('artists')?.lastOfficialUpdate).toBe(1000);
    expect(map24.get('artists')?.lastOfficialUpdate).toBe(9000);
  });

  it('overwrites existing sync state on re-put', async () => {
    const base = { slug: 'ba2025', tableName: 'artists', lastSyncedAt: 0, dataVersion: '' };
    await putSyncState(SYNC, { ...base, lastOfficialUpdate: 100 });
    await putSyncState(SYNC, { ...base, lastOfficialUpdate: 999 });

    const map = await getSyncState(SYNC, 'ba2025');
    expect(map.get('artists')?.lastOfficialUpdate).toBe(999);
  });
});

// ── Table key projection ──────────────────────────────────────────────────────

describe('queryAllKeys projection', () => {
  it('returns only slug + SK — no extra attributes', async () => {
    await batchPut(STAGES, [
      { slug: 'ba2025', stageId: '1', name: 'Main Stage', imageUrl: 'img.jpg' },
    ]);

    const keys = await queryAllKeys(STAGES, 'ba2025', 'stageId');
    expect(keys).toHaveLength(1);
    expect(Object.keys(keys[0]).sort()).toEqual(['slug', 'stageId'].sort());
  });
});
