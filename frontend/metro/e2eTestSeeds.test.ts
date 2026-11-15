import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { E2E_TEST_SEEDS_MODULE, NO_E2E_TEST_SEEDS, e2eTestSeedsFile, withE2eTestSeeds } = require('./e2eTestSeeds');

// ── Which seeds file a build carries ─────────────────────────────────────────
//
// Dimensions: EXPO_PUBLIC_E2E_SEEDS (unset, empty, a file that exists, one that
// does not); the import asked for (the seeds module, anything else); the
// resolver before ours (Metro's own, a config's).

const ROOT = join(__dirname, '..');
const SEEDS = join(ROOT, 'tests', 'fixtures', 'e2e', 'seeds.json');

describe('the file', () => {
  it('is the empty one when the build names none', () => {
    expect(e2eTestSeedsFile(ROOT, {})).toBe(NO_E2E_TEST_SEEDS);
    expect(e2eTestSeedsFile(ROOT, { EXPO_PUBLIC_E2E_SEEDS: '' })).toBe(NO_E2E_TEST_SEEDS);
  });

  it('is the one the build names, from the project root', () => {
    expect(e2eTestSeedsFile(ROOT, { EXPO_PUBLIC_E2E_SEEDS: 'tests/fixtures/e2e/seeds.json' })).toBe(SEEDS);
  });

  it('fails the build on a file that is not there, naming it and the variable', () => {
    expect(() => e2eTestSeedsFile(ROOT, { EXPO_PUBLIC_E2E_SEEDS: 'tests/fixtures/e2e/seed.json' }))
      .toThrow(/EXPO_PUBLIC_E2E_SEEDS.*tests\/fixtures\/e2e\/seed\.json/);
  });
});

describe('resolving imports', () => {
  const env = { EXPO_PUBLIC_E2E_SEEDS: 'tests/fixtures/e2e/seeds.json' };

  it('hands the seeds module the build\'s file', () => {
    const config = withE2eTestSeeds({ resolver: {} }, ROOT, env);
    const context = { resolveRequest: jest.fn() };
    expect(config.resolver.resolveRequest(context, E2E_TEST_SEEDS_MODULE, 'ios')).toEqual({ type: 'sourceFile', filePath: SEEDS });
    expect(context.resolveRequest).not.toHaveBeenCalled();
  });

  it('leaves every other import to Metro', () => {
    const config = withE2eTestSeeds({ resolver: {} }, ROOT, env);
    const resolved = { type: 'sourceFile', filePath: '/x.js' };
    const context = { resolveRequest: jest.fn(() => resolved) };
    expect(config.resolver.resolveRequest(context, 'react', 'ios')).toBe(resolved);
    expect(context.resolveRequest).toHaveBeenCalledWith(context, 'react', 'ios');
  });

  it('leaves every other import to the config\'s own resolver, when it has one', () => {
    const resolved = { type: 'sourceFile', filePath: '/y.js' };
    const own = jest.fn(() => resolved);
    const config = withE2eTestSeeds({ resolver: { resolveRequest: own } }, ROOT, env);
    const context = { resolveRequest: jest.fn() };
    expect(config.resolver.resolveRequest(context, 'react', 'ios')).toBe(resolved);
    expect(own).toHaveBeenCalledWith(context, 'react', 'ios');
  });
});
