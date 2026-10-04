// ── Free the disk space the iOS E2E suite leaves behind ───────────────────────
//
//   npm run clean:e2e:ios
//   npm run clean:e2e:ios -- --sim "iPhone 17"   the simulator a --sim run used
//
// Deletes only what the next `npm run test:e2e:ios` rebuilds by itself:
//
//   - the test simulator, erased to factory state (the bulk, ~3 GB). Every app
//     and setting on it goes, not just this one; the runner boots it, installs
//     the app and re-applies its keyboard settings. Its first boot afterwards
//     is slow.
//   - downloaded EAS simulator builds (re-downloaded; Android APKs are kept)
//   - Maestro's debug output in ~/.maestro/tests, and the last run's reports

import { existsSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILD_CACHE } from './lib/eas.ts';
import { must, parseArgs, run, skip } from './lib/proc.ts';
import { findSimulator, simulatorName } from './lib/simulator.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.platform !== 'darwin') {
  skip('iOS simulators need macOS');
}

function sizeMb(path: string): number {
  const r = run('du', ['-sk', path]);
  return r.ok ? Math.round(Number(r.out.split(/\s/)[0]) / 1024) : 0;
}

let freedMb = 0;

function remove(path: string, what: string): void {
  if (!existsSync(path)) {
    return;
  }
  const mb = sizeMb(path);
  rmSync(path, { recursive: true, force: true });
  freedMb += mb;
  console.log(`${String(mb).padStart(6)} MB  ${what}`);
}

// ── Simulator ─────────────────────────────────────────────────────────────────

const sim = findSimulator(simulatorName(parseArgs(process.argv.slice(2))));
const data = join(homedir(), 'Library', 'Developer', 'CoreSimulator', 'Devices', sim.udid, 'data');
const before = sizeMb(data);
if (sim.state !== 'Shutdown') {
  must('xcrun', ['simctl', 'shutdown', sim.udid]);
}
must('xcrun', ['simctl', 'erase', sim.udid]);
const erasedMb = before - sizeMb(data);
freedMb += erasedMb;
console.log(`${String(erasedMb).padStart(6)} MB  simulator ${sim.name} (${sim.udid}), erased`);

// ── Files ─────────────────────────────────────────────────────────────────────

// A simulator build is cached as app.tar.gz; an Android one as an .apk, which
// install:perf:android still wants.
if (existsSync(BUILD_CACHE)) {
  for (const id of readdirSync(BUILD_CACHE)) {
    if (existsSync(join(BUILD_CACHE, id, 'app.tar.gz'))) {
      remove(join(BUILD_CACHE, id), `EAS simulator build ${id.slice(0, 8)}`);
    }
  }
}
remove(join(homedir(), '.maestro', 'tests'), 'Maestro debug output');
remove(join(ROOT, 'e2e-results', 'ios'), 'last run\'s reports');

console.log(`\nfreed ~${(freedMb / 1024).toFixed(1)} GB; the next test:e2e:ios rebuilds all of it`);
