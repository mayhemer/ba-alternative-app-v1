// ── Install a perf build on the connected Android device ──────────────────────
//
//   npm run install:perf:android                 newest finished `perf` build
//   npm run install:perf:android -- --version 22 that build number (versionCode),
//                                                e.g. an older one to re-measure
//   npm run install:perf:android -- --serial X   when several devices are connected
//   npm run install:perf:android -- --force      reinstall even if already there
//
// The perf build points at the fixture API (http://localhost:4010, reached over
// USB via `adb reverse`) and opens on ba2025, so it replaces whatever build of
// the app the device had. APKs are cached by EAS build id, so reinstalling the
// same build does not download it again.

import { adb, installedVersion, PACKAGE, pickDevice } from './lib/adb.ts';
import { buildByVersion, fetchArtifact, latestBuild, staleness } from './lib/eas.ts';
import { EXIT, has, parseArgs, run, skip } from './lib/proc.ts';

const args = parseArgs(process.argv.slice(2));
const device = pickDevice(typeof args.serial === 'string' ? args.serial : undefined);
console.log(`device: ${device.model} — Android ${device.android} (API ${device.sdk}), ${device.serial}`);

if (!has('eas')) {
  skip('eas-cli is not installed', 'npm install -g eas-cli');
}
if (args.version === true) {
  skip('--version needs a build number', 'e.g. `--version 22` (the versionCode EAS lists).');
}
const wanted = typeof args.version === 'string' ? args.version : null;

let build;
if (wanted !== null) {
  build = buildByVersion('android', wanted);
  if (build === null) {
    skip(`no Android EAS build with versionCode ${wanted}`, 'Check `eas build:list --platform android`, or `eas login`.');
  }
  if (build.url === '') {
    skip(`build ${build.id.slice(0, 8)} (versionCode ${wanted}) has no artifact — not finished, or failed`,
      'Pick another versionCode.');
  }
  if (build.profile !== 'perf') {
    // Installable, but it talks to the production API: test:perf:device refuses
    // it unless run with --allow-live-api.
    console.log(`\x1b[33m⚠ a "${build.profile}" build, not "perf"\x1b[0m`);
  }
} else {
  try {
    build = latestBuild('android', 'perf');
  } catch (e) {
    skip((e as Error).message, 'Run `eas login`.');
  }
  if (build === null) {
    skip('no finished EAS build for the "perf" profile yet', 'Run `npm run build:perf:android`.');
  }
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
// in place — or a build signed with another key. Only those two fall back to
// uninstalling, which also clears the app's data; any other failure (device
// dropped off USB, rebooted, out of space) stops here with the app untouched.
const UNINSTALL_FIRST = ['INSTALL_FAILED_VERSION_DOWNGRADE', 'INSTALL_FAILED_UPDATE_INCOMPATIBLE'];
const update = run('adb', ['-s', device.serial, 'install', '-r', apk]);
if (!update.ok || /Failure/.test(update.out)) {
  const output = `${update.out}\n${update.err}`.trim();
  const reason = output.match(/INSTALL_FAILED_\w+/)?.[0];
  if (reason === undefined || !UNINSTALL_FIRST.includes(reason)) {
    console.error(`\x1b[31minstall failed\x1b[0m (${reason ?? `adb exit ${update.code}`}) — the installed app was left as it was.`);
    console.error(output);
    process.exit(EXIT.FAIL);
  }
  console.log(`update refused (${reason}); uninstalling the existing app and installing fresh…`);
  adb(device, ['uninstall', PACKAGE]);
  adb(device, ['install', apk]);
}

console.log(`installed versionCode ${installedVersion(device)}.`);
process.exit(EXIT.PASS);
