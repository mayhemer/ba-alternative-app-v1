// ── A Release simulator build of the working tree, made on this Mac ───────────
//
// The same kind of binary EAS makes for the `e2e-ios-sim` profile — Release,
// simulator SDK, JS bundled in, no dev launcher — without the cloud round trip.
//
// It builds from the prebuilt ios/ folder and never regenerates it: prebuild
// rewrites ios/ wholesale, so after a change to app.json, a config plugin or a
// native dependency, run `npm run prebuild:ios` yourself first.
//
// EXPO_PUBLIC_* values are inlined when the JS is bundled, and Xcode's "Bundle
// React Native code" phase bundles with xcodebuild's environment — so the
// profile's env goes on xcodebuild. Metro's cache is reset on every build so a
// bundle cached with other values cannot slip through.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, skip } from './proc.ts';

const SCHEME = 'BrutalAssaultalt';

/** Builds and returns the path of the .app; exits the run when it cannot. */
export function buildLocalSimulatorApp(root: string, profile: string): string {
  const ios = join(root, 'ios');
  const workspace = join(ios, `${SCHEME}.xcworkspace`);
  if (!existsSync(workspace) || !existsSync(join(ios, 'Pods'))) {
    skip('no prebuilt ios/ project to build from', 'Run `npm run prebuild:ios`.');
  }

  const derivedData = join(ios, 'build', 'e2e');
  console.log(`building ${profile} locally (Release, simulator)…`);
  const build = run('xcodebuild', [
    '-workspace', workspace,
    '-scheme', SCHEME,
    '-configuration', 'Release',
    '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator',
    '-derivedDataPath', derivedData,
    '-quiet',
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ], {
    stdio: 'inherit',
    env: { ...process.env, ...profileEnv(root, profile), EXTRA_PACKAGER_ARGS: '--reset-cache' },
  });
  if (!build.ok) {
    throw new Error(`xcodebuild failed (${build.code}) — its errors are above`);
  }

  const app = join(derivedData, 'Build', 'Products', 'Release-iphonesimulator', `${SCHEME}.app`);
  if (!existsSync(app)) {
    throw new Error(`xcodebuild succeeded but left no ${app}`);
  }
  return app;
}

/** The profile's `env` from eas.json, so a local build bakes in what EAS would. */
function profileEnv(root: string, profile: string): Record<string, string> {
  const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8')) as {
    build: Record<string, { env?: Record<string, string> } | undefined>;
  };
  const env = eas.build[profile]?.env;
  if (env === undefined) {
    throw new Error(`eas.json has no env for the "${profile}" profile`);
  }
  return env;
}
