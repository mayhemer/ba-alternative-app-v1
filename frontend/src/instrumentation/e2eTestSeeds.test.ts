import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyE2eTestSeed, applyE2eTestSeedFromLaunch, parseE2eTestSeeds, type E2eTestSeed } from './e2eTestSeeds';
import { getLocalInterests, hydrateInterests, setInterest } from '../cache/cacheService';

// ── E2E test seeds: a returning user's picks, without starring them by hand ──
//
// Dimensions: the build (carries a seeds file, carries none); the launch (a
// seed named, none, a name the file lacks); the edition running (the seed's
// own, another); the install (fresh, already seeded and changed since); the
// file (well formed, a pick the app cannot store, a seed without an edition).
//
// The AsyncStorage mock and the interest cache live for the whole file, so each
// case uses its own edition and seed name.

let counter = 0;
function fresh(): { slug: string; name: string } {
  counter += 1;
  return { slug: `seedtest${counter}`, name: `seed-${counter}` };
}

function seedsFor(name: string, seed: E2eTestSeed): Record<string, E2eTestSeed> {
  return { [name]: seed };
}

const CRYSTAL_LAKE = { artistId: '35', name: 'CRYSTAL LAKE', status: 'will_go' } as const;

async function storedFor(slug: string): Promise<Record<string, { status: string }>> {
  const raw = await AsyncStorage.getItem(`user:interests:v2:${slug}`);
  return raw === null ? {} : JSON.parse(raw);
}

describe('applying a seed', () => {
  it('stores its picks for its edition, as the app will read them back', async () => {
    const { slug, name } = fresh();
    await applyE2eTestSeed(name, slug, seedsFor(name, {
      slug,
      picks: [
        CRYSTAL_LAKE,
        { artistId: '221', name: 'KUNDY CREW', status: 'maybe' },
        { artistId: '220', name: 'PIT OF DOOM', status: 'dont_go' },
      ],
    }));
    const stored = await storedFor(slug);
    expect(stored['35'].status).toBe('will_go');
    expect(stored['221'].status).toBe('maybe');
    expect(stored['220'].status).toBe('dont_go');
    const hydrated = await hydrateInterests(slug);
    expect(Object.keys(hydrated).sort()).toEqual(['220', '221', '35']);
  });

  it('leaves another edition alone', async () => {
    const { slug, name } = fresh();
    await applyE2eTestSeed(name, 'some-other-edition', seedsFor(name, { slug, picks: [CRYSTAL_LAKE] }));
    expect(await storedFor(slug)).toEqual({});
    expect(await storedFor('some-other-edition')).toEqual({});
  });

  it('seeds an install once: a pick changed since stays as the user left it', async () => {
    const { slug, name } = fresh();
    const seeds = seedsFor(name, { slug, picks: [CRYSTAL_LAKE] });
    await applyE2eTestSeed(name, slug, seeds);
    await setInterest(slug, '35', 'none');
    await applyE2eTestSeed(name, slug, seeds);
    expect(getLocalInterests(slug)?.['35'].status).toBe('none');
  });

  it('fails on a seed the file lacks, naming it', async () => {
    const { slug } = fresh();
    await expect(applyE2eTestSeed('returning-usr', slug, {})).rejects.toThrow('returning-usr');
  });
});

describe('a seed named at launch', () => {
  it('is applied when the build carries a seeds file', async () => {
    const { slug, name } = fresh();
    await applyE2eTestSeedFromLaunch(slug, {
      bundled: seedsFor(name, { slug, picks: [CRYSTAL_LAKE] }),
      readArgument: (key) => (key === 'e2eSeed' ? name : null),
    });
    expect((await storedFor(slug))['35'].status).toBe('will_go');
  });

  it('is not even looked for when the build carries none', async () => {
    const { slug, name } = fresh();
    const readArgument = jest.fn(() => name);
    await applyE2eTestSeedFromLaunch(slug, { bundled: null, readArgument });
    expect(readArgument).not.toHaveBeenCalled();
    expect(await storedFor(slug)).toEqual({});
  });

  it('changes nothing when the launch names none', async () => {
    const { slug, name } = fresh();
    await applyE2eTestSeedFromLaunch(slug, { bundled: seedsFor(name, { slug, picks: [CRYSTAL_LAKE] }), readArgument: () => null });
    expect(await storedFor(slug)).toEqual({});
  });
});

describe('reading a seeds file', () => {
  it('reads a build without one as none', () => {
    expect(parseE2eTestSeeds(null)).toBeNull();
  });

  it('reads its seeds and their picks, and drops the description', () => {
    expect(parseE2eTestSeeds({ 'a-user': { about: 'why', slug: 'ba2025', picks: [CRYSTAL_LAKE] } }))
      .toEqual({ 'a-user': { slug: 'ba2025', picks: [CRYSTAL_LAKE] } });
  });

  it('fails on a pick the app cannot store, naming the seed and the artist', () => {
    expect(() => parseE2eTestSeeds({ 'a-user': { slug: 'ba2025', picks: [{ ...CRYSTAL_LAKE, status: 'must_see' }] } }))
      .toThrow(/a-user.*35.*must_see/);
  });

  it('fails on a seed without an edition, naming it', () => {
    expect(() => parseE2eTestSeeds({ 'a-user': { picks: [CRYSTAL_LAKE] } })).toThrow('a-user');
  });
});

describe('the seeds file the E2E build carries', () => {
  // A typo in an artist id would seed nothing and fail a flow far from the cause.
  it('names only artists in their edition\'s fixture lineup, by their lineup names', () => {
    const fixtures = join(__dirname, '..', '..', 'tests', 'fixtures');
    const seeds = parseE2eTestSeeds(JSON.parse(readFileSync(join(fixtures, 'e2e', 'seeds.json'), 'utf8')));
    expect(seeds).not.toBeNull();
    Object.entries(seeds ?? {}).forEach(([seedName, seed]) => {
      const artists = JSON.parse(readFileSync(join(fixtures, 'generated', seed.slug, 'artists.json'), 'utf8')) as { artistId: string | number; name: string }[];
      const names = new Map(artists.map((a) => [String(a.artistId), a.name]));
      seed.picks.forEach(({ artistId, name }) => {
        expect(`${seedName}: ${artistId} ${names.get(artistId) ?? 'missing'}`).toBe(`${seedName}: ${artistId} ${name}`);
      });
    });
  });
});
