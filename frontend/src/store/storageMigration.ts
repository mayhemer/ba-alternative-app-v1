import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Local storage migration ───────────────────────────────────────────────────
//
// One-shot conversion of data written by older builds, run at startup before
// anything is hydrated. Each format change bumps the affected keys to a new
// version; the old key is converted into the new one and then removed.
//
// The key names and value shapes are spelled out here rather than imported:
// a migration converts between two fixed formats, and must keep doing so after
// the stores move on.
//
// Per key pair:
//   - new key present → old key is deleted and its content ignored. This is the
//     upgrade-after-downgrade case: the newer data wins.
//   - only old key    → converted, written to the new key, then the old key is
//     deleted. A crash in between leaves both, which the next run resolves as above.
// A downgraded build reads its old keys, finds nothing, and starts empty.

// ── v1 → v2: interest status 'must_see' became the server's 'will_go' ────────

const INTERESTS_V1_PREFIX = 'user:interests:';
const INTERESTS_V2_PREFIX = 'user:interests:v2:';
const LENS_SCOPE_V1 = 'lens:scope';
const LENS_SCOPE_V2 = 'lens:scope:v2';

function statusToV2(status: unknown): unknown {
  return status === 'must_see' ? 'will_go' : status;
}

// Record<artistId, { status, updatedAt }>
function convertInterestsV2(raw: string): string {
  const map = JSON.parse(raw) as Record<string, { status: unknown; updatedAt: number }>;
  const result: typeof map = {};
  for (const [artistId, record] of Object.entries(map)) {
    result[artistId] = { ...record, status: statusToV2(record.status) };
  }
  return JSON.stringify(result);
}

// LensScope; only the 'me' and 'friend' kinds carry a level.
function convertLensScopeV2(raw: string): string {
  const scope = JSON.parse(raw) as { kind: string; level?: unknown };
  if (scope.level === undefined) {
    return raw;
  }
  return JSON.stringify({ ...scope, level: statusToV2(scope.level) });
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function migratePair(
  oldKey: string,
  newKey: string,
  presentKeys: ReadonlySet<string>,
  convert: (raw: string) => string,
): Promise<void> {
  if (presentKeys.has(newKey)) {
    await AsyncStorage.removeItem(oldKey);
    return;
  }
  const raw = await AsyncStorage.getItem(oldKey);
  if (raw !== null) {
    let converted: string | null = null;
    try {
      converted = convert(raw);
    } catch {
      // Unreadable old data is dropped rather than carried over.
    }
    if (converted !== null) {
      await AsyncStorage.setItem(newKey, converted);
    }
  }
  await AsyncStorage.removeItem(oldKey);
}

export async function runStorageMigrations(): Promise<void> {
  const presentKeys = new Set(await AsyncStorage.getAllKeys());

  const steps: Promise<void>[] = [];
  for (const key of presentKeys) {
    if (key.startsWith(INTERESTS_V1_PREFIX) && !key.startsWith(INTERESTS_V2_PREFIX)) {
      const slug = key.slice(INTERESTS_V1_PREFIX.length);
      steps.push(migratePair(key, INTERESTS_V2_PREFIX + slug, presentKeys, convertInterestsV2));
    }
  }
  if (presentKeys.has(LENS_SCOPE_V1)) {
    steps.push(migratePair(LENS_SCOPE_V1, LENS_SCOPE_V2, presentKeys, convertLensScopeV2));
  }
  await Promise.all(steps);
}

let migration: Promise<void> | null = null;

/**
 * Runs the migrations once per launch; later calls (edition switches) share the
 * first run. Never rejects — on a storage failure the old keys stay and the next
 * launch tries again.
 */
export function migrateLocalStorage(): Promise<void> {
  if (migration === null) {
    migration = runStorageMigrations().catch(() => undefined);
  }
  return migration;
}
