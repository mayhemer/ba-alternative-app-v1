// ── Native E2E on the iOS Simulator ───────────────────────────────────────────
//
//   npm run test:e2e:ios                      latest EAS `e2e-ios-sim` build
//   npm run test:e2e:ios -- --app path/X.app  a local simulator build instead
//   npm run test:e2e:ios -- --sim "iPhone 17" a different simulator
//   npm run test:e2e:ios -- --show            bring up the Simulator window
//
// Boots a simulator, installs the app, serves the fixture API on :4010 (the
// simulator shares the Mac's network, so the build's http://localhost:4010
// reaches it), runs every Maestro flow in e2e/native, and exits with Maestro's
// result.
//
// It tests a BUILT BINARY. Anything changed since that build is not covered,
// which is why it prints where the build came from — rebuild with
// `npm run build:ios:e2e` after app changes. `--app` exists so a locally built
// simulator app can be swapped in without touching the rest of this script.
//
// Exit codes: 0 pass, 1 fail, 4 skipped (a prerequisite is missing) — `verify`
// reports a skip without failing on it.

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from '../tests/server/fixtureServer.ts';
import { fetchArtifact, findAppBundle, latestBuild, staleness } from './lib/eas.ts';
import { EXIT, has, must, parseArgs, run, skip } from './lib/proc.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLOWS = join(ROOT, 'e2e', 'native');
const REPORTS = join(ROOT, 'e2e-results', 'ios');
const BUNDLE_ID = 'cz.janbambas.ba';
const PROFILE = 'e2e-ios-sim';

const args = parseArgs(process.argv.slice(2));
const simName = typeof args.sim === 'string' ? args.sim : (process.env.IOS_SIM ?? 'iPhone 17 Pro');

// ── Prerequisites ─────────────────────────────────────────────────────────────

if (process.platform !== 'darwin') {
  skip('iOS simulator tests need macOS');
}
if (!has('xcrun') || !run('xcrun', ['simctl', 'help']).ok) {
  skip('Xcode command line tools are not available', 'Install Xcode and run `xcode-select --install`.');
}
if (!has('maestro')) {
  skip('Maestro is not installed', 'curl -Ls "https://get.maestro.mobile.dev" | bash');
}

// ── Simulator ─────────────────────────────────────────────────────────────────

type Sim = { udid: string; name: string; state: string };

function findSimulator(wanted: string): Sim {
  const json = JSON.parse(must('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])) as {
    devices: Record<string, Sim[]>;
  };
  const all = Object.values(json.devices).flat();
  const match = all.find((d) => d.udid === wanted) ?? all.find((d) => d.name === wanted);
  if (match === undefined) {
    const names = [...new Set(all.map((d) => d.name))].filter((n) => n.startsWith('iPhone')).join(', ');
    skip(`no available simulator named "${wanted}"`, `Available: ${names}. Pass --sim "<name>".`);
  }
  return match;
}

const sim = findSimulator(simName);
console.log(`simulator: ${sim.name} (${sim.udid})`);
if (sim.state !== 'Booted') {
  console.log('booting…');
  run('xcrun', ['simctl', 'boot', sim.udid]);
}
// Blocks until the simulator has finished booting, not merely started.
must('xcrun', ['simctl', 'bootstatus', sim.udid, '-b']);
if (args.show === true) {
  run('open', ['-a', 'Simulator']);
}

// ── App ───────────────────────────────────────────────────────────────────────

async function resolveApp(): Promise<string> {
  if (typeof args.app === 'string') {
    const app = resolve(args.app);
    if (!existsSync(app)) {
      skip(`--app ${app} does not exist`);
    }
    console.log(`app: ${app} (local build — origin is whatever it was built with)`);
    return app;
  }

  if (!has('eas')) {
    skip('eas-cli is not installed, and no --app was given', 'npm install -g eas-cli');
  }
  let build;
  try {
    build = latestBuild('ios', PROFILE);
  } catch (e) {
    skip((e as Error).message, 'Run `eas login`.');
  }
  if (build === null) {
    skip(`no finished EAS build for the "${PROFILE}" profile yet`, 'Run `npm run build:ios:e2e`.');
  }

  const { note, behind } = staleness(build.commit);
  const flag = behind === 0 ? '' : '  \x1b[33m⚠ not testing your latest code\x1b[0m';
  console.log(`app: EAS build ${build.id.slice(0, 8)}, ${note}${flag}`);

  const archive = await fetchArtifact(build, 'app.tar.gz');
  const dir = join(dirname(archive), 'extracted');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    must('tar', ['-xzf', archive, '-C', dir]);
  }
  const app = findAppBundle(dir);
  if (app === null) {
    throw new Error(`no .app inside ${basename(archive)} — is this a simulator build?`);
  }
  return app;
}

const app = await resolveApp();
// Installed fresh every run: cheap, and no doubt about which binary is under test.
must('xcrun', ['simctl', 'install', sim.udid, app]);

// ── Fixture API ───────────────────────────────────────────────────────────────

let server;
try {
  server = await startFixtureServer(4010);
} catch (e) {
  console.error(`could not start the fixture API on :4010 (${(e as Error).message}).`);
  console.error('Is `npm run serve:fixtures` already running in another terminal?');
  process.exit(EXIT.FAIL);
}

// ── Run ───────────────────────────────────────────────────────────────────────

rmSync(REPORTS, { recursive: true, force: true });
mkdirSync(REPORTS, { recursive: true });

const maestro = run('maestro', [
  'test',
  '--device', sim.udid,
  '--format', 'junit',
  '--output', join(REPORTS, 'junit.xml'),
  '--test-output-dir', REPORTS,
  FLOWS,
], { stdio: 'inherit' });

await server.close();
console.log(`\nreport: ${join(REPORTS, 'junit.xml')}  (screenshots and logs alongside)`);
console.log(`checked ${BUNDLE_ID} on ${sim.name}`);
process.exit(maestro.ok ? EXIT.PASS : EXIT.FAIL);
