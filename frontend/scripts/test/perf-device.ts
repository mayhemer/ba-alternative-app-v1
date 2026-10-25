// ── Performance on a real Android device ──────────────────────────────────────
//
//   npm run test:perf:device                    all scenarios, 7 runs each
//   npm run test:perf:device -- --runs 3        quicker, noisier
//   npm run test:perf:device -- --warmup 0      no unmeasured run first
//   npm run test:perf:device -- --scenarios cold-start,day-switch
//   npm run test:perf:device -- --baseline      record perf/devices/<model>.json
//   npm run test:perf:device -- --allow-live-api   a non-perf build (production API)
//
// Measures the INSTALLED build (put the latest perf build on with
// `npm run install:perf:android`) on whichever phone is connected — today the
// Nokia 3, the low-end target. Driven over adb, but every measured window runs
// on the phone by itself: one adb call starts the injector (lib/androidInput.ts),
// which opens the window, plays the gestures on its own clock and reads the
// frames, so the Mac's timing never reaches the numbers. See lib/androidUi.ts
// for why Maestro is kept out of the measured part.
//
// Scrolling scenarios first move to a fixed place (from an edge, by plain
// drags), and each run goes out and back with mirrored flings. A run that hits
// an edge cannot come back to where it started, so every run reports how far
// off it ended (driftPx) and is flagged when that is more than about a row.
//
// Report-only for now: it prints medians against the device baseline but does
// not fail. Thresholds need the noise floor first, measured by running this a
// few times on unchanged code — the method that showed the Mac's.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adb, type Device, installedVersion, PACKAGE, pickDevice, shell } from '../lib/adb.ts';
import { batteryTempC, coldStart, coolDown, FRAMES_READ, FRAMES_RESET, type FramePhases, type Frames, type Memory, markGapMs, parseFramePhases, parseFrames, readMemory } from '../lib/androidMetrics.ts';
import { drift, inject, pushInjector, type Step } from '../lib/androidInput.ts';
import { dumpUi, find, tap, tapWhenVisible, type UiNode, waitFor } from '../lib/androidUi.ts';
import { buildByVersion, staleness } from '../lib/eas.ts';
import { type FixtureProcess, startFixtureProcess } from '../lib/fixtureProcess.ts';
import { EXIT, parseArgs, run, skip, sleep } from '../lib/proc.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const RUNS = Number(args.runs ?? 7);
const WARMUP = Number(args.warmup ?? 1);
const MAX_TEMP = Number(args['max-temp'] ?? 36);
const LIVE = args['allow-live-api'] === true;
// In this order on purpose: each leaves the app where the next one starts.
const ALL = ['cold-start', 'list-fling', 'detail-open', 'search-typing', 'day-switch', 'timeline-pan'];
const SCENARIOS = typeof args.scenarios === 'string' ? args.scenarios.split(',') : ALL;
// Bumped whenever what a scenario does changes: a baseline recorded another way
// is not compared against.
const METHOD = 2;

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
// Background dexopt recompiles an installed app over the following days, so
// the same build can get faster between sessions; recorded to tell.
const compiled = /\[status=([^\]]+)\]/.exec(shell(d, `dumpsys package ${PACKAGE}`))?.[1] ?? 'unknown';

// ── Conditioning, undone on exit ──────────────────────────────────────────────

const undo: (() => void)[] = [];
function restore(): void {
  while (undo.length > 0) {
    try { undo.pop()!(); } catch { /* best effort */ }
  }
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { console.log('\ninterrupted — restoring the device…'); restore(); process.exit(EXIT.FAIL); });
}

shell(d, 'svc power stayon usb');
undo.push(() => shell(d, 'svc power stayon false'));
undo.push(pushInjector(d));

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
// The USB cable that carries adb also charges the phone, and charging warms the
// battery the temperature gate reads; a full battery only trickles.
const batteryOut = shell(d, 'dumpsys battery');
const battery = {
  level: Number(/level:\s*(\d+)/.exec(batteryOut)?.[1] ?? NaN),
  status: Number(/status:\s*(\d+)/.exec(batteryOut)?.[1] ?? NaN),
  tempC: batteryTempC(d),
};
console.log(`screen: ${W}x${H}, battery ${battery.level}% ${battery.tempC.toFixed(1)}°C, compiled ${compiled}, `
  + `runs ${RUNS} (+${WARMUP} warm-up), cool to ≤${MAX_TEMP}°C\n`);
if (battery.level < 95) {
  console.log(`  ⚠ battery at ${battery.level}%: it charges during the run and warms up — results are noisier\n`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Idle time before every measured window, after cooling: the phone parks all
// but one core within a second or so, and every run should start from that.
const SETTLE_MS = 3000;
// Between opening the window and the first event, for the injector's start-up
// to finish — it boots right before the window.
const LEAD_MS = 500;
// Off by more than this after going out and back: an edge stopped a fling. Not
// zero when nothing did: the list's virtualization swaps estimated heights for
// measured ones as rows render, which moves rows by tens of pixels.
const EDGE_PX = 150;

async function openSection(label: string): Promise<void> {
  await tapWhenVisible(d, { desc: 'Open menu' });
  await sleep(600);
  await tapWhenVisible(d, { text: label });
  await sleep(1500);
}

const swipe = (x1: number, y1: number, x2: number, y2: number, ms: number, holdMs = 0): Step =>
  ({ swipe: [x1 * W, y1 * H, x2 * W, y2 * H], ms, holdMs });

/** Unmeasured input, with the injector rather than a second's CPU of `input`. */
function play(steps: Step[]): void {
  inject(d, steps);
}

/** Cools, then idles, so every window starts from the same state. */
async function settle(): Promise<number> {
  const tempC = await coolDown(d, MAX_TEMP);
  await sleep(SETTLE_MS);
  return tempC;
}

type Window = { frames: Frames; phases: FramePhases; lateMaxMs: number };

/** One measured window, entirely on the device: open, play, read. */
function measure(steps: Step[], open = ''): Window {
  const r = inject(d, [{ sh: `${open}${FRAMES_RESET}` }, { wait: LEAD_MS }, ...steps, { sh: FRAMES_READ }]);
  return { frames: parseFrames(r.out), phases: parseFramePhases(r.out), lateMaxMs: r.lateMaxMs };
}

type Sample = Record<string, number | null>;
const results: Record<string, Sample[]> = {};
const edgeRuns: Record<string, number> = {};

/** Warm-up runs first, unrecorded: the first run after a launch is the odd one. */
async function repeat(scenario: string, once: () => Promise<{ sample: Sample; line: string }>): Promise<void> {
  for (let i = 1 - WARMUP; i <= RUNS; i++) {
    const { sample, line } = await once();
    if (i >= 1) {
      (results[scenario] ??= []).push(sample);
    }
    console.log(`    ${i >= 1 ? `run ${i}` : 'warm-up'}: ${line}`);
  }
}

const framesSample = (w: Window, tempC: number): Sample => ({
  jankyPct: w.frames.jankyPct, p50Ms: w.frames.p50, p90Ms: w.frames.p90, p99Ms: w.frames.p99,
  over33: w.frames.over33, meanMs: w.frames.meanMs, slowUiThread: w.frames.slowUiThread,
  deadlineMissed: w.frames.deadlineMissed, frames: w.frames.total, tempC, lateMaxMs: w.lateMaxMs,
  // Where the frames' time went (lib/androidMetrics.ts): means per phase, in ms.
  fsFrames: w.phases.frames, fsStartMs: w.phases.startMs, fsInputMs: w.phases.inputMs, fsAnimMs: w.phases.animMs,
  fsLayoutMs: w.phases.layoutMs, fsDrawMs: w.phases.drawMs, fsUiMs: w.phases.uiMs, fsRtWaitMs: w.phases.rtWaitMs,
  fsSyncMs: w.phases.syncMs, fsGpuMs: w.phases.gpuMs, fsSwapMs: w.phases.swapMs, fsTotalMs: w.phases.totalMs,
});
const framesLine = (f: Frames): string =>
  `${f.total} frames, mean ${f.meanMs} ms, p90 ${f.p90} ms, ≥34 ms ${f.over33}, slow UI thread ${f.slowUiThread}`;
const memorySample = (m: Memory): Sample => ({
  totalPssMb: Math.round(m.totalPssKb / 102.4) / 10,
  graphicsMb: Math.round(m.graphicsKb / 102.4) / 10,
});

/**
 * Scrolls through one measured window that should end where it started, and
 * says how far off it ended. `pick` selects labels that scroll with the content.
 */
async function measureRoundTrip(scenario: string, steps: Step[], pick: (n: UiNode) => boolean,
  before: UiNode[]): Promise<{ sample: Sample; line: string; after: UiNode[] }> {
  const tempC = await settle();
  const w = measure(steps);
  const after = dumpUi(d);
  const dr = drift(before, after, pick);
  const driftPx = dr === null ? null : Math.round(Math.hypot(dr.dx, dr.dy));
  const edge = driftPx === null || driftPx > EDGE_PX;
  if (edge) {
    edgeRuns[scenario] = (edgeRuns[scenario] ?? 0) + 1;
  }
  return {
    sample: { ...framesSample(w, tempC), driftPx },
    line: `${framesLine(w.frames)}, drift ${driftPx ?? '>1 screen'} px${edge ? ' ⚠ did not come back — an edge?' : ''}`,
    after,
  };
}

// ── The Artists list ──────────────────────────────────────────────────────────

// A row is the one element whose label merges name, genre and country.
const isArtistRow = (n: UiNode): boolean => /^[^,]+, [^,]+, /.test(n.desc || n.text);

function listToTop(): void {
  play([...Array.from({ length: 8 }, (): Step[] => [swipe(0.5, 0.3, 0.5, 0.85, 120), { wait: 300 }]).flat(), { wait: 2500 }]);
}

/**
 * From the top, a fixed distance down with plain drags (no fling), so every
 * session flings from the same rows. Far enough that the flings back up stop
 * short of the top, and short enough of the end of the list.
 */
function listToMiddle(): void {
  listToTop();
  play([...Array.from({ length: 6 }, (): Step[] => [swipe(0.5, 0.8, 0.5, 0.35, 400, 200), { wait: 300 }]).flat(), { wait: 1500 }]);
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

async function scenarioColdStart(): Promise<void> {
  let checked = false;
  await repeat('cold-start', async () => {
    const tempC = await settle();
    const c = coldStart(d, component);
    await sleep(2000);
    const mem = readMemory(d);
    if (!checked && server !== null && !(await server.requests()).some((r) => /^\/ba\d+\//.test(r))) {
      throw new Error('the app made no requests to the fixture API — is a perf build installed? '
        + '(`npm run install:perf:android`)');
    }
    checked = true;
    return {
      sample: { firstFrameMs: c.firstFrameMs, readyMs: c.readyMs, ...memorySample(mem), tempC },
      line: `first frame ${c.firstFrameMs} ms, ready ${c.readyMs ?? 'n/a'} ms`,
    };
  });
}

async function scenarioListFling(): Promise<void> {
  // Two flings down, the second catching the first, then the same back up.
  await openSection('Artists');
  listToMiddle();
  const flings: Step[] = [
    swipe(0.5, 0.8, 0.5, 0.2, 120), { wait: 600 }, swipe(0.5, 0.8, 0.5, 0.2, 120), { wait: 3500 },
    swipe(0.5, 0.2, 0.5, 0.8, 120), { wait: 600 }, swipe(0.5, 0.2, 0.5, 0.8, 120), { wait: 3500 },
  ];
  let before = dumpUi(d);
  await repeat('list-fling', async () => {
    const r = await measureRoundTrip('list-fling', flings, isArtistRow, before);
    before = r.after;
    return { sample: { ...r.sample, ...memorySample(readMemory(d)) }, line: r.line };
  });
}

async function scenarioDetailOpen(): Promise<void> {
  // The artist sheet: a bottom-sheet animation over the list, plus the hero
  // image and the HTML bio rendered into it — the heaviest single tap in the app.
  await openSection('Artists');
  listToTop();
  // Whichever artist is first: the phone keeps the edition it was last on.
  const row = dumpUi(d).find(isArtistRow);
  if (row === undefined) {
    throw new Error('no artist row on screen — is the lineup loaded?');
  }
  await repeat('detail-open', async () => {
    const tempC = await settle();
    const w = measure([{ tap: [row.x, row.y] }, { wait: 2500 }]); // the sheet's spring, then the bio
    shell(d, 'input keyevent KEYCODE_BACK'); // closes the sheet (back history)
    await sleep(1500);
    return { sample: framesSample(w, tempC), line: framesLine(w.frames) };
  });
}

async function scenarioSearchTyping(): Promise<void> {
  await openSection('Artists');
  const field = find(dumpUi(d), { id: 'artist-search' }) ?? (await waitFor(d, { cls: 'android.widget.EditText' }));
  tap(d, field);
  await sleep(1500); // keyboard animation must finish before the window opens
  await repeat('search-typing', async () => {
    const tempC = await settle();
    // A fast typist's pace, the same every run — `input text` typed as fast as
    // the app let it, so how busy the app was decided how many renders it got.
    const w = measure([{ text: 'mast', msPerKey: 150 }, { wait: 2000 }]);
    shell(d, `input keyevent KEYCODE_MOVE_END ${'KEYCODE_DEL '.repeat(8)}`);
    await sleep(1500);
    return { sample: framesSample(w, tempC), line: framesLine(w.frames) };
  });
}

// The day switcher renders weekdays with textTransform: 'uppercase', so the
// screen says "WED" — match case-insensitively rather than on the source names.
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

async function festivalDays(): Promise<[UiNode, UiNode]> {
  // Leave search first, so the keyboard is not up over the timeline. Only when it
  // is up: with nothing to dismiss, BACK walks the app's history and can leave it.
  if (/mInputShown=true/.test(shell(d, 'dumpsys input_method'))) {
    shell(d, 'input keyevent KEYCODE_BACK');
    await sleep(800);
  }
  await openSection('Program');
  const days = dumpUi(d).filter((n) => WEEKDAYS.includes(n.text.toUpperCase()));
  if (days.length < 2) {
    throw new Error(`need two festival days, found ${days.length} — is the edition's schedule loaded?`);
  }
  return [days[0], days[1]];
}

async function scenarioDaySwitch(): Promise<void> {
  const [a, b] = await festivalDays();
  console.log(`    switching ${a.text} → ${b.text}`);
  await repeat('day-switch', async () => {
    play([{ tap: [a.x, a.y] }]);
    await sleep(3000); // unmeasured: get back to day A and let it settle
    const tempC = await settle();
    // The log is emptied with the window, so the marks read below are this run's.
    const w = measure([{ tap: [b.x, b.y] }, { wait: 4000 }], 'logcat -c; '); // the progressive mount spreads the day over many frames
    // The JS side of the switch, which frame stats cannot see: from the tap's
    // handler to the frame after the last slice of the day mounted. Null on a
    // build older than the marks.
    const mountMs = markGapMs(d, 'day:select', 'timeline:mounted');
    return {
      sample: { ...framesSample(w, tempC), mountMs },
      line: `${framesLine(w.frames)}, mounted in ${mountMs ?? 'n/a'} ms`,
    };
  });
}

async function scenarioTimelinePan(): Promise<void> {
  // Panning a settled day — the interaction the festival is spent in. No JS
  // render should happen (DESIGN.md, progressive mount); what is left is the UI
  // thread moving several hundred native views.
  //
  // Horizontal only: a day's lanes overflow the screen by about a lane at most
  // (99 px on the fixture edition), so any vertical fling just hits both ends.
  const [, b] = await festivalDays(); // a no-op after day-switch; needed when run alone
  play([{ tap: [b.x, b.y] }]);
  await sleep(3000); // whatever the day switch left mounting, finished
  // To the start of the day, then a fixed way in: the same blocks every session,
  // with the whole day's width ahead and room to come back.
  play([
    ...Array.from({ length: 10 }, (): Step[] => [swipe(0.15, 0.47, 0.9, 0.47, 120), { wait: 300 }]).flat(), { wait: 2000 },
    swipe(0.9, 0.47, 0.1, 0.47, 400, 200), { wait: 300 }, swipe(0.9, 0.47, 0.1, 0.47, 400, 200), { wait: 1500 },
  ]);
  // Two pans to later, the second catching the first, then the same back.
  const pans: Step[] = [
    swipe(0.8, 0.47, 0.2, 0.47, 150), { wait: 400 }, swipe(0.8, 0.47, 0.2, 0.47, 150), { wait: 1500 },
    swipe(0.2, 0.47, 0.8, 0.47, 150), { wait: 400 }, swipe(0.2, 0.47, 0.8, 0.47, 150), { wait: 1500 },
  ];
  // Blocks show their time range; lane names and the ruler stay put on one axis.
  const isBlockTime = (n: UiNode): boolean => /^\d{1,2}:\d\d–\d{1,2}:\d\d$/.test(n.text);
  let before = dumpUi(d);
  await repeat('timeline-pan', async () => {
    const r = await measureRoundTrip('timeline-pan', pans, isBlockTime, before);
    before = r.after;
    return r;
  });
}

const RUNNERS: Record<string, () => Promise<void>> = {
  'cold-start': scenarioColdStart,
  'list-fling': scenarioListFling,
  'detail-open': scenarioDetailOpen,
  'search-typing': scenarioSearchTyping,
  'day-switch': scenarioDaySwitch,
  'timeline-pan': scenarioTimelinePan,
};

// ── Run ───────────────────────────────────────────────────────────────────────

let failed = false;
try {
  // Every other scenario starts inside the running app, which cold-start leaves
  // behind; without it, launch the app once, unmeasured.
  if (!SCENARIOS.includes('cold-start')) {
    coldStart(d, component);
    await sleep(2000);
  }
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
const baselineJson = existsSync(baselineFile)
  ? (JSON.parse(readFileSync(baselineFile, 'utf8')) as { meta: { method?: number }; summary: Summary })
  : null;
// Numbers taken another way are not comparable; a baseline from before methods
// were numbered is method 1.
const baseline = baselineJson !== null && (baselineJson.meta.method ?? 1) === METHOD ? baselineJson.summary : null;

console.log(`\n── ${d.model} ── medians of ${RUNS} runs${baseline ? ' (vs baseline)' : ''}`);
if (baselineJson !== null && baseline === null) {
  console.log(`   the baseline was measured with method ${baselineJson.meta.method ?? 1}, this is ${METHOD} — not compared`);
}
// Context for a run, not something to compare.
const DIAGNOSTIC = new Set(['tempC', 'driftPx', 'lateMaxMs', 'fsFrames']);
for (const [scenario, metrics] of Object.entries(summary)) {
  const edges = edgeRuns[scenario] ?? 0;
  console.log(`\n${scenario}${edges > 0 ? `  ⚠ ${edges} run(s) did not come back — an edge?` : ''}`);
  for (const [metric, v] of Object.entries(metrics)) {
    if (metric === 'tempC') {
      continue;
    }
    const base = DIAGNOSTIC.has(metric) ? undefined : baseline?.[scenario]?.[metric]?.median;
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

const meta = {
  device: d, versionCode: version, build: build?.id ?? null, commit: build?.commit ?? null,
  method: METHOD, runs: RUNS, warmup: WARMUP, compiled, battery, at: new Date().toISOString(),
};
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
