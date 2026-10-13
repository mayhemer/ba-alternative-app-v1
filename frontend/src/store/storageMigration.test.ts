import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateLocalStorage, runStorageMigrations } from './storageMigration';
import { hydrateInterests } from '../cache/cacheService';
import { getUiState, hydrateLocalState } from './uiStatePersistence';

// ── Local storage migration v1 → v2 ───────────────────────────────────────────
//
// v1 stored the interest status 'must_see', v2 stores the server's 'will_go'.
// The rules pinned here are what make downgrade/upgrade safe: newer data always
// wins, old keys never survive a run, and nothing is lost on the happy path.

const V1_INTERESTS = (slug: string): string => `user:interests:${slug}`;
const V2_INTERESTS = (slug: string): string => `user:interests:v2:${slug}`;
const V1_LENS = 'lens:scope';
const V2_LENS = 'lens:scope:v2';

async function stored(key: string): Promise<unknown> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

async function store(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('interests', () => {
  it('converts a v1-only map to v2 and removes v1', async () => {
    await store(V1_INTERESTS('ba2025'), {
      a1: { status: 'must_see', updatedAt: 1 },
      a2: { status: 'maybe', updatedAt: 2 },
      a3: { status: 'none', updatedAt: 3 },
    });

    await runStorageMigrations();

    expect(await stored(V2_INTERESTS('ba2025'))).toEqual({
      a1: { status: 'will_go', updatedAt: 1 },
      a2: { status: 'maybe', updatedAt: 2 },
      a3: { status: 'none', updatedAt: 3 },
    });
    expect(await AsyncStorage.getItem(V1_INTERESTS('ba2025'))).toBeNull();
  });

  it('keeps v2 untouched and drops v1 when both exist (upgrade after a downgrade)', async () => {
    await store(V1_INTERESTS('ba2025'), { a1: { status: 'must_see', updatedAt: 9 } });
    await store(V2_INTERESTS('ba2025'), { a2: { status: 'maybe', updatedAt: 1 } });

    await runStorageMigrations();

    expect(await stored(V2_INTERESTS('ba2025'))).toEqual({ a2: { status: 'maybe', updatedAt: 1 } });
    expect(await AsyncStorage.getItem(V1_INTERESTS('ba2025'))).toBeNull();
  });

  it('leaves v2-only data alone', async () => {
    await store(V2_INTERESTS('ba2025'), { a1: { status: 'will_go', updatedAt: 1 } });

    await runStorageMigrations();

    expect(await stored(V2_INTERESTS('ba2025'))).toEqual({ a1: { status: 'will_go', updatedAt: 1 } });
    expect(await AsyncStorage.getAllKeys()).toEqual([V2_INTERESTS('ba2025')]);
  });

  it('does nothing on an empty store', async () => {
    await runStorageMigrations();

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('migrates every edition', async () => {
    await store(V1_INTERESTS('ba2024'), { a1: { status: 'must_see', updatedAt: 1 } });
    await store(V1_INTERESTS('ba2025'), { a2: { status: 'must_see', updatedAt: 2 } });

    await runStorageMigrations();

    expect(await stored(V2_INTERESTS('ba2024'))).toEqual({ a1: { status: 'will_go', updatedAt: 1 } });
    expect(await stored(V2_INTERESTS('ba2025'))).toEqual({ a2: { status: 'will_go', updatedAt: 2 } });
    expect([...await AsyncStorage.getAllKeys()].sort()).toEqual(
      [V2_INTERESTS('ba2024'), V2_INTERESTS('ba2025')]);
  });

  it('drops unreadable v1 data without writing v2 and without throwing', async () => {
    await AsyncStorage.setItem(V1_INTERESTS('ba2025'), '{not json');

    await expect(runStorageMigrations()).resolves.toBeUndefined();

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('writes the key the interest cache reads', async () => {
    await store(V1_INTERESTS('ba2025'), { a1: { status: 'must_see', updatedAt: 1 } });

    await runStorageMigrations();

    expect(await hydrateInterests('ba2025')).toEqual({ a1: { status: 'will_go', updatedAt: 1 } });
  });
});

describe('lens scope', () => {
  it('converts a v1 "my picks, must-see" scope', async () => {
    await store(V1_LENS, { kind: 'me', level: 'must_see' });

    await runStorageMigrations();

    expect(await stored(V2_LENS)).toEqual({ kind: 'me', level: 'will_go' });
    expect(await AsyncStorage.getItem(V1_LENS)).toBeNull();
  });

  it('carries a scope without a level over unchanged', async () => {
    await store(V1_LENS, { kind: 'all' });

    await runStorageMigrations();

    expect(await stored(V2_LENS)).toEqual({ kind: 'all' });
  });

  it('keeps v2 and drops v1 when both exist', async () => {
    await store(V1_LENS, { kind: 'me', level: 'must_see' });
    await store(V2_LENS, { kind: 'all' });

    await runStorageMigrations();

    expect(await stored(V2_LENS)).toEqual({ kind: 'all' });
    expect(await AsyncStorage.getItem(V1_LENS)).toBeNull();
  });

  it('writes the key the UI-state snapshot reads', async () => {
    await store(V1_LENS, { kind: 'me', level: 'must_see' });

    await runStorageMigrations();
    await hydrateLocalState('ba2025');

    expect(getUiState('lensScope')).toEqual({ kind: 'me', level: 'will_go' });
  });
});

describe('once per launch', () => {
  // A fresh module registry gives a module that has not run yet — and its own
  // storage mock instance, which is the one to spy on.
  function freshModules(): { storage: typeof AsyncStorage; migration: typeof import('./storageMigration') } {
    let modules!: ReturnType<typeof freshModules>;
    jest.isolateModules(() => {
      modules = {
        // The jest mock is a CommonJS module.exports, not an ES default export.
        storage: require('@react-native-async-storage/async-storage'),
        migration: require('./storageMigration'),
      };
    });
    return modules;
  }

  it('runs on the first call only; later calls share it', async () => {
    const { storage, migration } = freshModules();
    const getAllKeys = jest.spyOn(storage, 'getAllKeys');

    await Promise.all([migration.migrateLocalStorage(), migration.migrateLocalStorage()]);
    await migration.migrateLocalStorage();

    expect(getAllKeys).toHaveBeenCalledTimes(1);
  });

  it('never rejects, even when storage fails', async () => {
    const { storage, migration } = freshModules();
    jest.spyOn(storage, 'getAllKeys').mockRejectedValueOnce(new Error('disk'));

    await expect(migration.migrateLocalStorage()).resolves.toBeUndefined();
  });

  it('is what startup hydration runs first', async () => {
    // migrateLocalStorage is shared with hydrateLocalState: whichever ran first,
    // a second call resolves without touching storage again.
    await hydrateLocalState('ba2025');
    const getAllKeys = jest.spyOn(AsyncStorage, 'getAllKeys');

    await migrateLocalStorage();

    expect(getAllKeys).not.toHaveBeenCalled();
    getAllKeys.mockRestore();
  });
});
