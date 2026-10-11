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
  deadlineMissed: number;
  // From the histogram. On the Nokia 3 nearly every frame is over 16 ms, so
  // jankyPct sits at 100 % and says nothing; frames of 34 ms or more (two
  // vsyncs missed) and the mean still move.
  over33: number;
  meanMs: number;
};

export const FRAMES_RESET = `dumpsys gfxinfo ${PACKAGE} reset >/dev/null`;

export function parseFrames(out: string): Frames {
  const num = (re: RegExp): number => Number(re.exec(out)?.[1] ?? NaN);
  const total = num(/Total frames rendered:\s*(\d+)/);
  const buckets = [...(/HISTOGRAM:(.*)/.exec(out)?.[1] ?? '').matchAll(/(\d+)ms=(\d+)/g)]
    .map((m) => ({ ms: Number(m[1]), n: Number(m[2]) }));
  const counted = buckets.reduce((s, b) => s + b.n, 0);
  // With no frames, the platform reports the window length as every percentile.
  const pct = (re: RegExp): number => (total > 0 ? num(re) : NaN);
  return {
    total,
    jankyPct: num(/Janky frames:\s*\d+\s*\(([\d.]+)%\)/),
    p50: pct(/50th percentile:\s*(\d+)ms/),
    p90: pct(/90th percentile:\s*(\d+)ms/),
    p95: pct(/95th percentile:\s*(\d+)ms/),
    p99: pct(/99th percentile:\s*(\d+)ms/),
    slowUiThread: num(/Number Slow UI thread:\s*(\d+)/),
    missedVsync: num(/Number Missed Vsync:\s*(\d+)/),
    deadlineMissed: num(/Number Frame deadline missed:\s*(\d+)/),
    over33: buckets.filter((b) => b.ms >= 34).reduce((s, b) => s + b.n, 0),
    meanMs: counted > 0 ? Math.round((buckets.reduce((s, b) => s + b.ms * b.n, 0) / counted) * 10) / 10 : NaN,
  };
}

// ── Frame phases (dumpsys gfxinfo framestats) ─────────────────────────────────
// The summary above says how long frames took; this says where the time went.
// `framestats` appends a timestamp per stage for each frame, which splits a
// frame into what the UI thread did (input, Choreographer animation callbacks —
// where React Native's mounting and Reanimated's frame updates run — layout,
// recording the display list) and what the RenderThread and GPU did after it.
//
// Means rather than medians, so the phases add up to the total and a shift in
// the total can be traced to the phase it came from. HWUI keeps only the last
// 120 frames, so a longer window reports its end.

export type FramePhases = {
  frames: number;
  // Vsync to the frame starting: the UI thread was still busy with something
  // else — a previous frame, or work posted to its queue outside the frame.
  startMs: number;
  inputMs: number;
  animMs: number;
  layoutMs: number;
  drawMs: number;
  // The UI thread's part, input through draw.
  uiMs: number;
  // Waiting for the RenderThread to finish the previous frame.
  rtWaitMs: number;
  syncMs: number;
  gpuMs: number;
  swapMs: number;
  totalMs: number;
};

export const FRAMES_READ = `dumpsys gfxinfo ${PACKAGE} framestats`;

export function parseFramePhases(out: string): FramePhases {
  const sums = { startMs: 0, inputMs: 0, animMs: 0, layoutMs: 0, drawMs: 0, uiMs: 0, rtWaitMs: 0, syncMs: 0, gpuMs: 0, swapMs: 0, totalMs: 0 };
  let frames = 0;
  // One block per window of the app; each starts with its own header row.
  for (const block of out.split('---PROFILEDATA---').filter((_, i) => i % 2 === 1)) {
    const [header, ...rows] = block.trim().split('\n').map((l) => l.trim().replace(/,$/, '').split(','));
    if (header === undefined) {
      continue;
    }
    const col = (name: string): number => header.indexOf(name);
    const c = {
      flags: col('Flags'), vsync: col('IntendedVsync'), input: col('HandleInputStart'), anim: col('AnimationStart'),
      traversal: col('PerformTraversalsStart'), draw: col('DrawStart'), queued: col('SyncQueued'), sync: col('SyncStart'),
      issue: col('IssueDrawCommandsStart'), swap: col('SwapBuffers'), done: col('FrameCompleted'),
    };
    if (Object.values(c).some((i) => i < 0)) {
      continue;
    }
    for (const row of rows) {
      const t = (i: number): number => Number(row[i]);
      // Non-zero flags mark frames the platform says to leave out (a first draw
      // after a layout change, say), whose stages are not comparable.
      if (t(c.flags) !== 0 || !(t(c.done) > 0)) {
        continue;
      }
      const ms = (from: number, to: number): number => (t(to) - t(from)) / 1e6;
      sums.startMs += ms(c.vsync, c.input);
      sums.inputMs += ms(c.input, c.anim);
      sums.animMs += ms(c.anim, c.traversal);
      sums.layoutMs += ms(c.traversal, c.draw);
      sums.drawMs += ms(c.draw, c.queued);
      sums.uiMs += ms(c.input, c.queued);
      sums.rtWaitMs += ms(c.queued, c.sync);
      sums.syncMs += ms(c.sync, c.issue);
      sums.gpuMs += ms(c.issue, c.swap);
      sums.swapMs += ms(c.swap, c.done);
      sums.totalMs += ms(c.vsync, c.done);
      frames++;
    }
  }
  const mean = (s: number): number => (frames > 0 ? Math.round((s / frames) * 100) / 100 : NaN);
  return {
    frames,
    startMs: mean(sums.startMs), inputMs: mean(sums.inputMs), animMs: mean(sums.animMs),
    layoutMs: mean(sums.layoutMs), drawMs: mean(sums.drawMs), uiMs: mean(sums.uiMs),
    rtWaitMs: mean(sums.rtWaitMs), syncMs: mean(sums.syncMs), gpuMs: mean(sums.gpuMs),
    swapMs: mean(sums.swapMs), totalMs: mean(sums.totalMs),
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
export function coldStart(d: Device, component: string, timeoutS = 30): ColdStart {
  // One adb call, and the wait for the marker is one blocked logcat on the
  // device. Polling `logcat -d` from here instead dumped the whole log over USB
  // four times a second, on the phone's CPU, during the startup being timed.
  const ready = READY_MARK.replace(/[[\]]/g, '\\$&');
  const start = `START u0 .*cmp=${PACKAGE.replace(/\./g, '\\.')}/`;
  const out = shell(d, [
    `am force-stop ${PACKAGE}`,
    'logcat -c',
    `am start -W -n ${component}`,
    `timeout ${timeoutS} logcat -v epoch -m 1 -e '${ready}' >/dev/null`,
    `logcat -d -v epoch -e '${start}|${ready}'`,
  ].join('; '));
  const firstFrameMs = Number(/TotalTime:\s*(\d+)/.exec(out)?.[1] ?? NaN);
  const at = (re: string): number | null => {
    const m = new RegExp(`^\\s*([\\d.]+)\\s.*${re}`, 'm').exec(out);
    return m === null ? null : Number(m[1]);
  };
  const startAt = at(start);
  const readyAt = at(ready);
  return {
    firstFrameMs,
    readyMs: startAt === null || readyAt === null ? null : Math.round((readyAt - startAt) * 1000),
  };
}

// ── Gaps between perf marks ───────────────────────────────────────────────────

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
