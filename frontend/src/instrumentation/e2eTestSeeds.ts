import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledSeeds from 'e2e-test-seeds';
import { setInterest, type InterestStatus } from '../cache/cacheService';
import { launchArgument } from './launchArguments';

// ── E2E test seeds ────────────────────────────────────────────────────────────
//
// A named set of picks the E2E build stores at launch, so a flow that tests
// what picks lead to (My plan, conflicts, the lens) starts from them instead of
// starring every artist through search first. Flows that test starring itself
// still star by hand.
//
// The seeds are a JSON file (tests/fixtures/e2e/seeds.json) that only a build
// with EXPO_PUBLIC_E2E_SEEDS naming it carries (metro/e2eTestSeeds.js; the
// e2e-ios-sim profile); every other build carries `null` and never reads the
// launch. A seed is applied when the launch names it,
// `launchApp: arguments: { e2eSeed: <name> }` (launchArguments.ts), which the
// flows pass with a cleared state. An install is seeded once: a relaunch naming
// the seed again keeps what the flow changed since. StartupGate applies it
// before local state reads the picks, through setInterest, as a tap would.

export type E2eTestSeedPick = { artistId: string; name: string; status: InterestStatus };
export type E2eTestSeed = { slug: string; picks: E2eTestSeedPick[] };
export type E2eTestSeeds = Record<string, E2eTestSeed>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStatus(value: unknown): InterestStatus | null {
  switch (value) {
    case 'none':
    case 'maybe':
    case 'will_go':
    case 'dont_go':
      return value;
    default:
      return null;
  }
}

function parsePick(seedName: string, raw: unknown): E2eTestSeedPick {
  if (!isRecord(raw) || typeof raw.artistId !== 'string' || typeof raw.name !== 'string') {
    throw new Error(`E2E test seed "${seedName}": a pick needs a string artistId and name`);
  }
  const status = toStatus(raw.status);
  if (status === null) {
    throw new Error(`E2E test seed "${seedName}": artist ${raw.artistId} has the status "${String(raw.status)}", which the app does not store`);
  }
  return { artistId: raw.artistId, name: raw.name, status };
}

/** The seeds a seeds file holds; null for a build without one. Fails on what the app could not store. */
export function parseE2eTestSeeds(raw: unknown): E2eTestSeeds | null {
  if (raw === null) {
    return null;
  }
  if (!isRecord(raw)) {
    throw new Error('the E2E test seeds file is not an object of named seeds');
  }
  const seeds: E2eTestSeeds = {};
  for (const [name, seed] of Object.entries(raw)) {
    if (!isRecord(seed) || typeof seed.slug !== 'string' || !Array.isArray(seed.picks)) {
      throw new Error(`E2E test seed "${name}" needs an edition (slug) and a list of picks`);
    }
    seeds[name] = { slug: seed.slug, picks: seed.picks.map((pick) => parsePick(name, pick)) };
  }
  return seeds;
}

function seededKey(name: string, slug: string): string {
  return `e2e:seeded:${name}:${slug}`;
}

/** Stores seed `name`'s picks if it is for `slug` and this install has not had it yet. */
export async function applyE2eTestSeed(name: string, slug: string, seeds: E2eTestSeeds): Promise<void> {
  const seed = seeds[name];
  if (seed === undefined) {
    throw new Error(`no E2E test seed "${name}" in the build's seeds file`);
  }
  if (seed.slug !== slug) {
    return;
  }
  if (await AsyncStorage.getItem(seededKey(name, slug)) !== null) {
    return;
  }
  for (const { artistId, status } of seed.picks) {
    await setInterest(slug, artistId, status);
  }
  await AsyncStorage.setItem(seededKey(name, slug), '1');
}

type FromLaunchOptions = {
  /** The seeds file the build carries, unchecked; null without one. */
  bundled: unknown;
  readArgument: (key: string) => string | null;
};

/** Applies the seed the launch names, in a build that carries seeds. */
export async function applyE2eTestSeedFromLaunch(
  slug: string,
  { bundled, readArgument }: FromLaunchOptions = { bundled: bundledSeeds, readArgument: launchArgument },
): Promise<void> {
  const seeds = parseE2eTestSeeds(bundled);
  if (seeds === null) {
    return;
  }
  const name = readArgument('e2eSeed');
  if (name === null) {
    return;
  }
  await applyE2eTestSeed(name, slug, seeds);
}
