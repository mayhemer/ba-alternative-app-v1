// ── Deterministic input for the device perf runner ────────────────────────────
//
// `adb shell input` costs about a second of CPU per call on the Nokia 3 (it
// boots a fresh runtime every time), and its swipe is paced by the app it is
// measuring, so fling distance changed from run to run. The injector in
// scripts/android-inject/ boots once per measured window, before the window
// opens, and stamps every event from a fixed schedule — see Inject.java.
//
// Built here on demand with the JDK (javac) and r8's D8, which is fetched from
// Google's Maven repository into node_modules/.cache the first time. Pushed to
// /data/local/tmp for the run and removed afterwards.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Device, adb, shell } from './adb.ts';
import { must, run, skip } from './proc.ts';
import type { UiNode } from './androidUi.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCES = join(ROOT, 'scripts', 'android-inject');
const CACHE = join(ROOT, 'node_modules', '.cache', 'ba-android-inject');
const R8_VERSION = '8.13.25';
const R8_URL = `https://dl.google.com/dl/android/maven2/com/android/tools/r8/${R8_VERSION}/r8-${R8_VERSION}.jar`;
const MAIN = 'cz.janbambas.ba.perf.Inject';
export const INJECTOR_PATH = '/data/local/tmp/ba-inject.jar';

function javaFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      return javaFiles(p);
    }
    return p.endsWith('.java') ? [p] : [];
  });
}

/** The injector jar for the current sources, built when they changed. */
export function buildInjector(): string {
  const files = javaFiles(SOURCES).sort();
  const hash = createHash('sha1');
  for (const f of files) {
    hash.update(relative(SOURCES, f)).update(readFileSync(f));
  }
  const jar = join(CACHE, `inject-${hash.digest('hex').slice(0, 12)}.jar`);
  if (existsSync(jar)) {
    return jar;
  }
  if (!run('javac', ['-version']).ok) {
    skip('javac is not available — the injector is built with the JDK', 'brew install --cask temurin');
  }
  mkdirSync(CACHE, { recursive: true });
  const r8 = join(CACHE, `r8-${R8_VERSION}.jar`);
  if (!existsSync(r8)) {
    must('curl', ['-sfL', '-o', r8, R8_URL]);
  }
  const classes = join(CACHE, 'classes');
  run('rm', ['-rf', classes]);
  must('javac', ['--release', '8', '-Xlint:-options', '-d', classes, ...files]);
  // Only our own classes go in: the stubs stand in for the device's framework.
  const ours = join(classes, 'cz', 'janbambas', 'ba', 'perf');
  const dexInputs = readdirSync(ours).filter((f) => f.endsWith('.class')).map((f) => join(ours, f));
  must('java', ['-cp', r8, 'com.android.tools.r8.D8', '--min-api', '24', '--no-desugaring', '--output', jar, ...dexInputs]);
  return jar;
}

/** Puts the injector on the device; returns how to take it off again. */
export function pushInjector(d: Device): () => void {
  adb(d, ['push', buildInjector(), INJECTOR_PATH]);
  return () => { shell(d, `rm -f ${INJECTOR_PATH}`); };
}

export type Step =
  | { sh: string }
  | { swipe: [x1: number, y1: number, x2: number, y2: number]; ms: number; holdMs?: number }
  | { tap: [x: number, y: number] }
  | { text: string; msPerKey: number }
  | { wait: number };

const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

function stepArgs(s: Step): string[] {
  if ('sh' in s) {
    return ['sh', quote(s.sh)];
  }
  if ('swipe' in s) {
    return ['swipe', ...s.swipe.map((v) => String(Math.round(v))), String(s.ms), String(s.holdMs ?? 0)];
  }
  if ('tap' in s) {
    return ['tap', ...s.tap.map((v) => String(Math.round(v)))];
  }
  if ('text' in s) {
    return ['text', quote(s.text), String(s.msPerKey)];
  }
  return ['wait', String(s.wait)];
}

export type Injected = { out: string; events: number; lateMaxMs: number; lateOver8: number };

/** Runs the steps in one injector process, in one adb call. */
export function inject(d: Device, steps: Step[]): Injected {
  const out = shell(d, `CLASSPATH=${INJECTOR_PATH} app_process /system/bin ${MAIN} ${steps.flatMap(stepArgs).join(' ')}`);
  const m = /inject events=(\d+) lateMaxMs=(-?\d+) lateOver8=(\d+)/.exec(out);
  if (m === null) {
    throw new Error(`the injector failed: ${out.slice(-500)}`);
  }
  return { out: out.slice(0, m.index), events: Number(m[1]), lateMaxMs: Number(m[2]), lateOver8: Number(m[3]) };
}

// ── Where a scroll ended up ───────────────────────────────────────────────────
// A gesture that runs into the end of a list stops measuring scrolling. Every
// measured gesture here goes out and comes back the same way, so it should end
// where it started; comparing the screen before and after tells.

export type Drift = { dx: number; dy: number; matched: number };

/**
 * How far the content under the same labels moved between two dumps: the
 * median shift of every picked label that is on both screens exactly once, at
 * the same size — a label cut off by the screen edge has its centre moved.
 * `pick` keeps to the scrolled content — the header and the day switcher never
 * move and would pull the median to zero. Null when no label survived: the
 * content moved more than a screen.
 */
export function drift(before: UiNode[], after: UiNode[], pick: (n: UiNode) => boolean): Drift | null {
  const once = (nodes: UiNode[]): Map<string, UiNode> => {
    const seen = new Map<string, UiNode | null>();
    for (const n of nodes.filter(pick)) {
      const k = n.text || n.desc;
      if (k !== '') {
        seen.set(k, seen.has(k) ? null : n);
      }
    }
    return new Map([...seen].filter((e): e is [string, UiNode] => e[1] !== null));
  };
  const a = once(before);
  const b = once(after);
  const dx: number[] = [];
  const dy: number[] = [];
  for (const [k, n] of a) {
    const m = b.get(k);
    if (m !== undefined && m.w === n.w && m.h === n.h) {
      dx.push(m.x - n.x);
      dy.push(m.y - n.y);
    }
  }
  if (dx.length === 0) {
    return null;
  }
  const mid = (xs: number[]): number => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)];
  return { dx: mid(dx), dy: mid(dy), matched: dx.length };
}
