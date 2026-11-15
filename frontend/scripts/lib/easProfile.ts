// ── A build profile's env, from eas.json ──────────────────────────────────────
//
// eas.json is the one place a profile's env is written. EAS applies it to its
// builds; local builds read it here, so they bake in the same values: the
// E2E build (iosLocalBuild.ts) and the local run scripts (with-profile-env.ts).
// A profile's `extends` is followed as EAS does: the extended profile's env
// first, the profile's own values over it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type BuildProfile = { extends?: string; env?: Record<string, string> };
export type EasConfig = { build: Record<string, BuildProfile | undefined> };

/** eas.json of the project at `root`. */
export function readEasConfig(root: string): EasConfig {
  return JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8')) as EasConfig;
}

/** The env EAS would set for `profile`; fails on a profile eas.json lacks. */
export function profileEnv(eas: EasConfig, profile: string): Record<string, string> {
  const found = eas.build[profile];
  if (found === undefined) {
    throw new Error(`eas.json has no "${profile}" build profile`);
  }
  const inherited = found.extends !== undefined ? profileEnv(eas, found.extends) : {};
  return { ...inherited, ...found.env };
}
