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
//
// Two things keep later builds incremental:
//   - only this Mac's architecture is built. A generic simulator destination in
//     Release would build x86_64 and arm64 alike, twice the compiling, and the
//     simulator only ever runs the Mac's own.
//   - the build lives outside ios/, next to Xcode's own derived data, because
//     `npm run prebuild:ios` deletes ios/ and everything in it.

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { profileEnv, readEasConfig } from './easProfile.ts';
import { run, skip } from './proc.ts';

const SCHEME = 'BrutalAssaultalt';

/** Xcode's derived data for the local E2E build; `clean:e2e:ios` deletes it. */
export const LOCAL_BUILD_DIR = join(homedir(), 'Library', 'Developer', 'Xcode', 'DerivedData', `${SCHEME}-e2e`);

/** The simulator runs the Mac's own architecture, so only that one is built. */
const SIMULATOR_ARCH = process.arch === 'x64' ? 'x86_64' : 'arm64';

/** Builds and returns the path of the .app; exits the run when it cannot. */
export function buildLocalSimulatorApp(root: string, profile: string): string {
  const ios = join(root, 'ios');
  const workspace = join(ios, `${SCHEME}.xcworkspace`);
  if (!existsSync(workspace)) {
    skip(
      'no prebuilt ios/ project to build from — ios/ is generated from app.json and not in git',
      'Run `npm run prebuild:ios` (regenerates ios/ and installs its Pods, a few minutes), then re-run.',
    );
  }
  if (!existsSync(join(ios, 'Pods'))) {
    skip(
      'ios/ is prebuilt but its CocoaPods are not installed',
      'Run `npx pod-install` (or `npm run prebuild:ios` to regenerate ios/ as well), then re-run.',
    );
  }

  console.log(`building ${profile} locally (Release, simulator, ${SIMULATOR_ARCH})…`);
  const build = run('xcodebuild', [
    '-workspace', workspace,
    '-scheme', SCHEME,
    '-configuration', 'Release',
    '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator',
    '-derivedDataPath', LOCAL_BUILD_DIR,
    '-quiet',
    'CODE_SIGNING_ALLOWED=NO',
    `ARCHS=${SIMULATOR_ARCH}`,
    'build',
  ], {
    stdio: 'inherit',
    env: { ...process.env, ...profileEnv(readEasConfig(root), profile), EXTRA_PACKAGER_ARGS: '--reset-cache' },
  });
  if (!build.ok) {
    throw new Error(`xcodebuild failed (${build.code}) — its errors are above`);
  }

  const app = join(LOCAL_BUILD_DIR, 'Build', 'Products', 'Release-iphonesimulator', `${SCHEME}.app`);
  if (!existsSync(app)) {
    throw new Error(`xcodebuild succeeded but left no ${app}`);
  }
  return app;
}
