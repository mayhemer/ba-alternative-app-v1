// ── Performance on a real Android device ──────────────────────────────────────
//
//   npm run test:perf:device                    all scenarios, 7 runs each
//   npm run test:perf:device -- --runs 3        quicker, noisier
//   npm run test:perf:device -- --scenarios cold-start,day-switch
//   npm run test:perf:device -- --baseline      record perf/devices/<model>.json
//   npm run test:perf:device -- --allow-live-api   a non-perf build (production API)
//
// Measures the INSTALLED build (put the latest perf build on with
// `npm run install:perf:android`) on whichever phone is connected — today the
// Nokia 3, the low-end target. Everything is driven over adb; see
// lib/androidUi.ts for why Maestro is kept out of the measured part.
//
// Report-only for now: it prints medians against the device baseline but does
// not fail. Thresholds need the noise floor first, measured by running this a
// few times on unchanged code — the method that showed the Mac's.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adb, type Device, installedVersion, PACKAGE, pickDevice, shell } from './lib/adb.ts';
import { batteryTempC, coldStart, coolDown, type Frames, type Memory, readFrames, readMemory, resetFrames } from './lib/androidMetrics.ts';
import { dumpUi, find, tap, tapWhenVisible, waitFor } from './lib/androidUi.ts';
import { buildByVersion, staleness } from './lib/eas.ts';
import { type FixtureProcess, startFixtureProcess } from './lib/fixtureProcess.ts';
import { EXIT, parseArgs, run, skip, sleep } from './lib/proc.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const RUNS = Number(args.runs ?? 7);
const MAX_TEMP = Number(args['max-temp'] ?? 36);
const LIVE = args['allow-live-api'] === true;
const ALL = ['cold-start', 'list-fling', 'search-typing', 'day-switch'];
const SCENARIOS = typeof args.scenarios === 'string' ? args.scenarios.split(',') : ALL;

const d: Device = pickDevice(typeof args.serial === 'string' ? args.serial : undefined);
console.log(`device: ${d.model} — Android ${d.android} (API ${d.sdk}), ${d.serial}`);

// ── Preflight ─────────────────────────────────────────────────────────────────

const version = installedVersion(d);
if (version === null) {
  skip(`${PACKAGE} is not installed`, 'Run `npm run install:perf:android`.');
}
const build = buildByVersion('android', version);
if (build !== null) {
  const { note } = staleness(build.commit);
  console.log(`build:  versionCode ${version} — "${build.profile}" profile, ${note}`);
  if (build.profile !== 'perf' && !LIVE) {
    skip(`the installed build is a "${build.profile}" build, not "perf"`,
      'Run `npm run install:perf:android`, or pass --allow-live-api to measure it anyway.');
  }
} else {
  console.log(`build:  versionCode ${version} (not found on EAS — provenance unknown)`);
}
const component = shell(d, `cmd package resolve-activity --brief ${PACKAGE}`).split('\n').pop()!.trim();

// ── Conditioning, undone on exit ──────────────────────────────────────────────

const undo: (() => void)[] = [];
function restore(): void {
  while (undo.length > 0) {
    try { undo.pop()!(); } catch { /* best effort */ }
  }
}
process.on('SIGINT', () => { console.log('\ninterrupted — restoring the device…'); restore(); process.exit(EXIT.FAIL); });

shell(d, 'svc power stayon usb');
undo.push(() => shell(d, 'svc power stayon false'));

let server: FixtureProcess | null = null;
if (!LIVE) {
  // The phone's localhost:4010 becomes the Mac's, over USB — no Wi-Fi involved.
  adb(d, ['reverse', 'tcp:4010', 'tcp:4010']);
  undo.push(() => run('adb', ['-s', d.serial, 'reverse', '--remove', 'tcp:4010']));
  // A separate process, so the synchronous adb calls below — `am start -W`
  // blocks for seconds — never stall the app's requests mid-measurement.
  server = await startFixtureProcess(4010);
  undo.push(() => server?.close());

  // Fixture traffic goes over USB, so Wi-Fi only adds other apps syncing in the
  // background. Turned back on afterwards, if it was on.
  if (args['keep-wifi'] !== true && shell(d, 'settings get global wifi_on') === '1') {
    shell(d, 'svc wifi disable');
    undo.push(() => shell(d, 'svc wifi enable'));
    console.log('wifi:   off for the run (restored afterwards)');
  }
}

shell(d, 'input keyevent KEYCODE_WAKEUP');
shell(d, 'input keyevent 82');
await sleep(800);
if (/isStatusBarKeyguard=true/.test(shell(d, 'dumpsys window policy'))) {
  restore();
  skip('the device is locked', 'Set its screen lock to None — automation cannot type a PIN.');
}
shell(d, 'am kill-all');

const size = /(\d+)x(\d+)/.exec(shell(d, 'wm size'))!;
const W = Number(size[1]);
const H = Number(size[2]);
console.log(`screen: ${W}x${H}, battery ${batteryTempC(d).toFixed(1)}°C, runs ${RUNS}, cool to ≤${MAX_TEMP}°C\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function openSection(label: string): Promise<void> {
  await tapWhenVisible(d, { desc: 'Open menu' });
  await sleep(600);
  await tapWhenVisible(d, { text: label });
  await sleep(1500);
}

const fling = (fromY: number, toY: number): void => {
  shell(d, `input swipe ${Math.round(W / 2)} ${fromY} ${Math.round(W / 2)} ${toY} 120`);
};

async function scrollListToTop(): Promise<void> {
  for (let i = 0; i < 6; i++) { fling(Math.round(H * 0.3), Math.round(H * 0.85)); await sleep(250); }
  await sleep(1500);
}

type Sample = Record<string, number | null>;
const results: Record<string, Sample[]> = {};
const record = (scenario: string, s: Sample): void => { (results[scenario] ??= []).push(s); };

const framesSample = (f: Frames, tempC: number): Sample => ({
  jankyPct: f.jankyPct, p50Ms: f.p50, p90Ms: f.p90, p99Ms: f.p99,
  slowUiThread: f.slowUiThread, frames: f.total, tempC,
});
const memorySample = (m: Memory): Sample => ({
  totalPssMb: Math.round(m.totalPssKb / 102.4) / 10,
  graphicsMb: Math.round(m.graphicsKb / 102.4) / 10,
});

// ── Scenarios ─────────────────────────────────────────────────────────────────

async function scenarioColdStart(): Promise<void> {
  for (let i = 1; i <= RUNS; i++) {
    const tempC = await coolDown(d, MAX_TEMP);
    const c = await coldStart(d, component);
    await sleep(2000);
    const mem = readMemory(d);
    record('cold-start', { firstFrameMs: c.firstFrameMs, readyMs: c.readyMs, ...memorySample(mem), tempC });
    console.log(`    run ${i}: first frame ${c.firstFrameMs} ms, ready ${c.readyMs ?? 'n/a'} ms`);

    if (i === 1 && server !== null && !(await server.requests()).some((r) => /^\/ba\d+\//.test(r))) {
      throw new Error('the app made no requests to the fixture API — is a perf build installed? '
        + '(`npm run install:perf:android`)');
    }
  }
}

async function scenarioListFling(): Promise<void> {
  await openSection('Artists');
  for (let i = 1; i <= RUNS; i++) {
    await scrollListToTop();
    const tempC = await coolDown(d, MAX_TEMP);
    resetFrames(d);
    for (let k = 0; k < 3; k++) { fling(Math.round(H * 0.8), Math.round(H * 0.2)); await sleep(300); }
    await sleep(1500);
    const f = readFrames(d);
    record('list-fling', { ...framesSample(f, tempC), ...memorySample(readMemory(d)) });
    console.log(`    run ${i}: janky ${f.jankyPct}%, p90 ${f.p90} ms over ${f.total} frames`);
  }
  await scrollListToTop();
}

async function scenarioSearchTyping(): Promise<void> {
  await openSection('Artists');
  const field = find(dumpUi(d), { id: 'artist-search' }) ?? (await waitFor(d, { cls: 'android.widget.EditText' }));
  tap(d, field);
  await sleep(1500); // keyboard animation must finish before the window opens
  for (let i = 1; i <= RUNS; i++) {
    const tempC = await coolDown(d, MAX_TEMP);
    resetFrames(d);
    shell(d, 'input text mast');
    await sleep(2000);
    const f = readFrames(d);
    record('search-typing', framesSample(f, tempC));
    console.log(`    run ${i}: janky ${f.jankyPct}%, p90 ${f.p90} ms over ${f.total} frames`);
    shell(d, `input keyevent KEYCODE_MOVE_END ${'KEYCODE_DEL '.repeat(8)}`);
    await sleep(1500);
  }
}

// The day switcher renders weekdays with textTransform: 'uppercase', so the
// screen says "WED" — match case-insensitively rather than on the source names.
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

async function scenarioDaySwitch(): Promise<void> {
  // Leave search first, so the keyboard is not up over the timeline.
  shell(d, 'input keyevent KEYCODE_BACK');
  await sleep(800);
  await openSection('Program');
  const days = dumpUi(d).filter((n) => WEEKDAYS.includes(n.text.toUpperCase()));
  if (days.length < 2) {
    throw new Error(`need two festival days to switch between, found ${days.length} — is the edition's schedule loaded?`);
  }
  const [a, b] = days;
  console.log(`    switching ${a.text} → ${b.text}`);
  for (let i = 1; i <= RUNS; i++) {
    tap(d, a);
    await sleep(3000); // unmeasured: get back to day A and let it settle
    const tempC = await coolDown(d, MAX_TEMP);
    resetFrames(d);
    tap(d, b);
    await sleep(4000); // the progressive mount spreads the day over many frames
    const f = readFrames(d);
    record('day-switch', framesSample(f, tempC));
    console.log(`    run ${i}: janky ${f.jankyPct}%, p90 ${f.p90} ms, slow UI thread ${f.slowUiThread} over ${f.total} frames`);
  }
}

const RUNNERS: Record<string, () => Promise<void>> = {
  'cold-start': scenarioColdStart,
  'list-fling': scenarioListFling,
  'search-typing': scenarioSearchTyping,
  'day-switch': scenarioDaySwitch,
};

// ── Run ───────────────────────────────────────────────────────────────────────

let failed = false;
try {
  for (const name of SCENARIOS) {
    if (RUNNERS[name] === undefined) {
      throw new Error(`unknown scenario "${name}" — one of ${ALL.join(', ')}`);
    }
    console.log(`▶ ${name}`);
    await RUNNERS[name]();
  }
} catch (e) {
  failed = true;
  console.error(`\n✖ ${(e as Error).message}`);
} finally {
  restore();
}

// ── Report ────────────────────────────────────────────────────────────────────

const median = (xs: number[]): number => {
  const s = [...xs].sort((p, q) => p - q);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

type Summary = Record<string, Record<string, { median: number; min: number; max: number }>>;
const summary: Summary = {};
for (const [scenario, samples] of Object.entries(results)) {
  summary[scenario] = {};
  for (const metric of Object.keys(samples[0])) {
    const xs = samples.map((s) => s[metric]).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (xs.length > 0) {
      summary[scenario][metric] = { median: median(xs), min: Math.min(...xs), max: Math.max(...xs) };
    }
  }
}

const baselineFile = join(ROOT, 'perf', 'devices', `${d.model}.json`);
const baseline: Summary | null = existsSync(baselineFile)
  ? (JSON.parse(readFileSync(baselineFile, 'utf8')) as { summary: Summary }).summary
  : null;

console.log(`\n── ${d.model} ── medians of ${RUNS} runs${baseline ? ' (vs baseline)' : ''}`);
for (const [scenario, metrics] of Object.entries(summary)) {
  console.log(`\n${scenario}`);
  for (const [metric, v] of Object.entries(metrics)) {
    if (metric === 'tempC') {
      continue;
    }
    const base = baseline?.[scenario]?.[metric]?.median;
    let delta = '';
    if (base !== undefined && base !== 0) {
      const pct = ((v.median - base) / base) * 100;
      // Higher is worse for every metric here except frame count.
      const worse = metric === 'frames' ? pct < -20 : pct > 20;
      delta = `  vs ${base} (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)${worse ? ' 🔴' : ''}`;
    }
    console.log(`  ${metric.padEnd(14)} ${String(v.median).padEnd(8)} [${v.min}–${v.max}]${delta}`);
  }
}

const meta = { device: d, versionCode: version, build: build?.id ?? null, commit: build?.commit ?? null, runs: RUNS, at: new Date().toISOString() };
const outDir = join(ROOT, 'perf-results', 'device');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${d.model}-${meta.at.replace(/[:.]/g, '-')}.json`);
writeFileSync(outFile, JSON.stringify({ meta, summary, results }, null, 2));
console.log(`\nraw results: ${outFile}`);

if (args.baseline === true && !failed) {
  mkdirSync(dirname(baselineFile), { recursive: true });
  writeFileSync(baselineFile, `${JSON.stringify({ meta, summary }, null, 2)}\n`);
  console.log(`baseline written: ${baselineFile}`);
}

process.exit(failed ? EXIT.FAIL : EXIT.PASS);
