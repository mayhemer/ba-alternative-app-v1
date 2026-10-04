// ── Install the latest perf build on the connected Android device ─────────────
//
//   npm run install:perf:android                 newest finished `perf` build
//   npm run install:perf:android -- --serial X   when several devices are connected
//   npm run install:perf:android -- --force      reinstall even if already there
//
// The perf build points at the fixture API (http://localhost:4010, reached over
// USB via `adb reverse`) and opens on ba2025, so it replaces whatever build of
// the app the device had. APKs are cached by EAS build id, so reinstalling the
// same build does not download it again.

import { adb, installedVersion, pickDevice } from './lib/adb.ts';
import { fetchArtifact, latestBuild, staleness } from './lib/eas.ts';
import { EXIT, has, parseArgs, run, skip } from './lib/proc.ts';

const args = parseArgs(process.argv.slice(2));
const device = pickDevice(typeof args.serial === 'string' ? args.serial : undefined);
console.log(`device: ${device.model} — Android ${device.android} (API ${device.sdk}), ${device.serial}`);

if (!has('eas')) {
  skip('eas-cli is not installed', 'npm install -g eas-cli');
}
let build;
try {
  build = latestBuild('android', 'perf');
} catch (e) {
  skip((e as Error).message, 'Run `eas login`.');
}
if (build === null) {
  skip('no finished EAS build for the "perf" profile yet', 'Run `npm run build:android:perf`.');
}

const { note, behind } = staleness(build.commit);
console.log(`build:  ${build.id.slice(0, 8)} (versionCode ${build.buildVersion}), ${note}` +
  (behind === 0 ? '' : '  \x1b[33m⚠ not your latest code\x1b[0m'));

const current = installedVersion(device);
if (current === build.buildVersion && args.force !== true) {
  console.log(`already installed (versionCode ${current}) — nothing to do. --force reinstalls.`);
  process.exit(EXIT.PASS);
}

const apk = await fetchArtifact(build, 'app.apk');
console.log(`installing ${apk}…`);

// A plain update first. It is refused when the device holds a *higher*
// versionCode (a newer preview build, say) — release apps cannot be downgraded
// in place, so fall back to uninstalling, which also clears the app's data.
const update = run('adb', ['-s', device.serial, 'install', '-r', apk]);
if (!update.ok || /Failure/.test(update.out)) {
  const reason = (update.out + update.err).match(/INSTALL_FAILED_\w+/)?.[0] ?? 'unknown';
  console.log(`update refused (${reason}); uninstalling the existing app and installing fresh…`);
  adb(device, ['uninstall', 'cz.janbambas.ba']);
  adb(device, ['install', apk]);
}

console.log(`installed versionCode ${installedVersion(device)}.`);
process.exit(EXIT.PASS);
