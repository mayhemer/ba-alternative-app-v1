// ── Which E2E test seeds file a build carries ─────────────────────────────────
//
// The app imports its seeds as the module `e2e-test-seeds`
// (src/instrumentation/e2eTestSeeds.ts). Here Metro resolves that import, when
// it bundles, to the JSON file EXPO_PUBLIC_E2E_SEEDS names, relative to the
// project root (the e2e-ios-sim profile: tests/fixtures/e2e/seeds.json). Any
// other build gets src/instrumentation/noE2eTestSeeds.json, which holds `null`,
// so no seed and no test data reaches it.
//
// The name is read on the build machine while bundling; the app never sees it
// or opens a file by name.

const { existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const E2E_TEST_SEEDS_MODULE = 'e2e-test-seeds';
const NO_E2E_TEST_SEEDS = join(__dirname, '..', 'src', 'instrumentation', 'noE2eTestSeeds.json');

/** The seeds file a build with `env` carries; fails the build on a file that is not there. */
function e2eTestSeedsFile(projectRoot, env) {
  const named = env.EXPO_PUBLIC_E2E_SEEDS;
  if (named === undefined || named === '') {
    return NO_E2E_TEST_SEEDS;
  }
  const file = resolve(projectRoot, named);
  if (!existsSync(file)) {
    throw new Error(`EXPO_PUBLIC_E2E_SEEDS names ${named}, which is not a file (from ${projectRoot})`);
  }
  return file;
}

/** `config` with the seeds module resolved to the build's file; every other import as before. */
function withE2eTestSeeds(config, projectRoot, env) {
  const file = e2eTestSeedsFile(projectRoot, env);
  const previous = config.resolver.resolveRequest;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === E2E_TEST_SEEDS_MODULE) {
          return { type: 'sourceFile', filePath: file };
        }
        if (previous) {
          return previous(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { E2E_TEST_SEEDS_MODULE, NO_E2E_TEST_SEEDS, e2eTestSeedsFile, withE2eTestSeeds };
