// ── Timing markers for the device perf runner ─────────────────────────────────
//
// Perf builds only (EXPO_PUBLIC_PERF_MARKS=1 in the `perf` EAS profile). Each
// mark is one logcat line, `[perf] <name>`, which scripts/test-perf-device.ts
// reads with its device-side timestamp to time what frame statistics cannot
// see — how long the JS side takes to finish something. Inlined at build time,
// so other builds carry no marker and no cost.

const PERF_MARKS = process.env.EXPO_PUBLIC_PERF_MARKS === '1';

/** Names the runner matches literally — change both together. */
export type PerfMark = 'startup:ready' | 'day:select' | 'timeline:mounted';

export function perfMark(name: PerfMark): void {
  if (PERF_MARKS) {
    console.log(`[perf] ${name}`);
  }
}

export function perfMarksEnabled(): boolean {
  return PERF_MARKS;
}
