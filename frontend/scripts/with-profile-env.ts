// ── Run a command with a build profile's env from eas.json ────────────────────
//
//   node scripts/with-profile-env.ts <profile> <command> [args…]
//
// For the local run scripts (`start:sim:ios`, `install:preview:ios`, …), which
// build with `expo run:ios` and so never see eas.json: the command gets the
// profile's env (lib/easProfile.ts), as an EAS build of that profile would. A
// variable already set in the shell wins, so one run can differ, e.g. a fixed
// instant for development:
//   EXPO_PUBLIC_TIME_MODE=controlled EXPO_PUBLIC_TIME_NOW=2025-08-06T14:10:00+02:00 npm run start:sim:ios

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { profileEnv, readEasConfig } from './lib/easProfile.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const [profile, command, ...args] = process.argv.slice(2);
if (profile === undefined || command === undefined) {
  console.error('usage: node scripts/with-profile-env.ts <profile> <command> [args…]');
  process.exit(2);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...profileEnv(readEasConfig(ROOT), profile), ...process.env },
});
if (result.error !== undefined) {
  throw result.error;
}
process.exit(result.status ?? 1);
