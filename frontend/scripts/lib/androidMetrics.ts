// ── What the device perf runner measures, read straight from the platform ─────
//
// All of it is available on a release build through adb, with nothing added to
// the app except the one startup marker the perf build logs.

import { type Device, PACKAGE, shell } from './adb.ts';
import { run, sleep } from './proc.ts';

// ── Frames (dumpsys gfxinfo) ──────────────────────────────────────────────────
// Counts every frame the app's windows render between a reset and a read. This
// is the UI/render-thread view: JS-thread stalls show up here exactly when they
// hold up a frame, which is the part a user feels.

export type Frames = {
  total: number;
  jankyPct: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  slowUiThread: number;
  missedVsync: number;
};

export function resetFrames(d: Device): void {
  shell(d, `dumpsys gfxinfo ${PACKAGE} reset >/dev/null`);
}

export function readFrames(d: Device): Frames {
  const out = shell(d, `dumpsys gfxinfo ${PACKAGE}`);
  const num = (re: RegExp): number => Number(re.exec(out)?.[1] ?? NaN);
  return {
    total: num(/Total frames rendered:\s*(\d+)/),
    jankyPct: num(/Janky frames:\s*\d+\s*\(([\d.]+)%\)/),
    p50: num(/50th percentile:\s*(\d+)ms/),
    p90: num(/90th percentile:\s*(\d+)ms/),
    p95: num(/95th percentile:\s*(\d+)ms/),
    p99: num(/99th percentile:\s*(\d+)ms/),
    slowUiThread: num(/Number Slow UI thread:\s*(\d+)/),
    missedVsync: num(/Number Missed Vsync:\s*(\d+)/),
  };
}

// ── Memory (dumpsys meminfo, "App Summary") ───────────────────────────────────

export type Memory = { totalPssKb: number; graphicsKb: number; nativeHeapKb: number; javaHeapKb: number };

export function readMemory(d: Device): Memory {
  const out = shell(d, `dumpsys meminfo ${PACKAGE}`);
  const num = (re: RegExp): number => Number(re.exec(out)?.[1] ?? NaN);
  return {
    totalPssKb: num(/TOTAL(?: PSS)?:\s+(\d+)/),
    graphicsKb: num(/Graphics:\s+(\d+)/),
    nativeHeapKb: num(/Native Heap:\s+(\d+)/),
    javaHeapKb: num(/Java Heap:\s+(\d+)/),
  };
}

// ── Temperature ───────────────────────────────────────────────────────────────
// Android 9 has no thermal service, and the CPU thermal zones are not readable
// without root, so the battery sensor is the only gauge. It lags the CPU, which
// is why the runner waits for it to come back down rather than reading it once.

export function batteryTempC(d: Device): number {
  const m = /temperature:\s*(\d+)/.exec(shell(d, 'dumpsys battery'));
  return m === null ? NaN : Number(m[1]) / 10;
}

export async function coolDown(d: Device, maxC: number, timeoutMs = 10 * 60_000): Promise<number> {
  const until = Date.now() + timeoutMs;
  let t = batteryTempC(d);
  if (t > maxC) {
    process.stdout.write(`    cooling ${t.toFixed(1)}°C → ≤${maxC}°C `);
    while (t > maxC && Date.now() < until) {
      await sleep(15_000);
      t = batteryTempC(d);
      process.stdout.write('.');
    }
    process.stdout.write(` ${t.toFixed(1)}°C\n`);
  }
  return t;
}

// ── Cold start ────────────────────────────────────────────────────────────────

// Matched against src/utils/perfMarks.ts — change both together.
const READY_MARK = '[perf] startup:ready';

export type ColdStart = { firstFrameMs: number; readyMs: number | null };

/**
 * Force-stops the app, launches it, and times two moments: the first frame
 * (`am start -W` TotalTime — on this app that is the splash) and the frame the
 * app itself first paints, from the marker the perf build logs. The second is
 * what a user waits for; it is null on a build without the marker.
 */
export async function coldStart(d: Device, component: string, timeoutMs = 30_000): Promise<ColdStart> {
  shell(d, `am force-stop ${PACKAGE}`);
  run('adb', ['-s', d.serial, 'logcat', '-c']);
  const out = shell(d, `am start -W -n ${component}`);
  const firstFrameMs = Number(/TotalTime:\s*(\d+)/.exec(out)?.[1] ?? NaN);

  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const log = run('adb', ['-s', d.serial, 'logcat', '-d', '-v', 'epoch']).out;
    const start = /^\s*([\d.]+)\s.*START u0 .*cmp=cz\.janbambas\.ba\//m.exec(log);
    const ready = new RegExp(`^\\s*([\\d.]+)\\s.*${READY_MARK.replace(/[[\]]/g, '\\$&')}`, 'm').exec(log);
    if (start !== null && ready !== null) {
      return { firstFrameMs, readyMs: Math.round((Number(ready[1]) - Number(start[1])) * 1000) };
    }
    await sleep(250);
  }
  return { firstFrameMs, readyMs: null };
}

// ── Gaps between perf marks ───────────────────────────────────────────────────

/** Empties the device log, so the next read sees only what follows. */
export function clearLog(d: Device): void {
  run('adb', ['-s', d.serial, 'logcat', '-c']);
}

/**
 * Milliseconds from the last `[perf] <from>` mark to the first `[perf] <to>`
 * after it, by the device's own log timestamps — so adb's latency is not in it.
 * Null when either is missing: a build without marks, or work that did not
 * finish inside the wait.
 */
export function markGapMs(d: Device, from: string, to: string): number | null {
  const log = run('adb', ['-s', d.serial, 'logcat', '-d', '-v', 'epoch']).out;
  const at = (name: string): number[] => [...log.matchAll(new RegExp(`^\\s*([\\d.]+)\\s.*\\[perf\\] ${name}`, 'gm'))]
    .map((m) => Number(m[1]));
  const starts = at(from);
  if (starts.length === 0) {
    return null;
  }
  const start = starts[starts.length - 1];
  const end = at(to).find((t) => t >= start);
  return end === undefined ? null : Math.round((end - start) * 1000);
}
