// ── Sampling for the performance suite ────────────────────────────────────────
//
// Reassure's defaults are 10 runs and 1 warmup. Measured on this suite, that
// left a noise floor of up to ±14% — identical code compared against itself
// reported "changes" larger than many real regressions.
//
// Two changes brought it down. 30 runs and 3 warmups roughly halved it (to about
// ±6%), and repeating the subject to fill a ~20 ms measurement window (see
// `repeat` below) took it to about ±1-2% typically, with the occasional worse
// run at ~6%. Batching helped more than sampling did.
//
// Timer resolution is not, and never was, a factor: Reassure measures with
// perf_hooks.performance.now(), which steps in about 83 nanoseconds here — some
// five thousand times finer than the quantities being measured. (The *global*
// performance.now that React Native's Jest preset installs is Date.now, with 1 ms
// steps, which is why Reassure polyfills it during render measurement. Anything
// hand-rolled that reads the global timer will measure in whole milliseconds and
// look wildly unstable.)
//
// Two distinct noise sources were behind it, and neither is fixed by sampling
// alone — this only stops them dominating:
//
//  1. Rare, large spikes. About 0.7% of runs take up to 16x the median. Not
//     garbage collection: a GC observer recorded zero collections across 300
//     runs. The shape (isolated, huge, unpredictable) points at the OS
//     preempting the process. With 10 runs, one spike lands in a sample roughly
//     6% of the time and drags its standard deviation past 30%, which is what
//     made one scenario look inherently unstable when it was not.
//
//  2. Whole-suite drift between processes. The baseline and current
//     measurements are separate Jest runs seconds apart, and every scenario in
//     one of them can come out ~10% slower or faster *together* — CPU frequency
//     and machine load, not the code. This is why a report where everything
//     moved the same way means nothing changed.
//
// The warmup count matters separately: the first runs of a subject are slower
// while the JIT tiers up. (buildSections' Intl collators are module-level, so
// building them happens at import, outside any sample.) Three warmups keep the
// tier-up out of the sample reliably.
//
// None of this makes durations comparable *across machines* — they are not. Use
// render counts for that, and re-record the baseline locally.

export const MEASURE_OPTIONS = { runs: 30, warmupRuns: 3 } as const;

/**
 * Repeats `fn` so one measured run spans roughly 20 ms instead of a fraction of
 * one, and returns the wrapper to hand to `measureFunction`.
 *
 * This is what actually tightens the comparison, and by more than raising the
 * run count did. Measured over three identical-code comparisons of the same
 * function:
 *
 *   one call per run (~0.4 ms)   deltas -3.1%, +0.9%, -5.8%
 *   50 calls per run (~21 ms)    deltas -0.1%, +1.1%, -1.3%
 *
 * A longer window amortises the fixed cost of taking a measurement, and spreads
 * an occasional OS preemption across the whole batch rather than letting it land
 * on one sample of thirty as a 16x outlier. Within-sample standard deviation
 * goes *up* slightly — a 20 ms window is more likely to contain a preemption at
 * all — but the mean, which is what baseline and current are compared on, gets
 * far steadier.
 *
 * The reported duration is therefore the cost of N calls, not one. That is fine
 * for spotting regressions, which are relative, but do not read it as the cost
 * of a single call — hence the counts in the scenario names.
 */
export function repeat(fn: () => unknown, times: number): () => void {
  return () => {
    for (let i = 0; i < times; i++) { fn(); }
  };
}

// Chosen per scenario so each measured run lands near 20 ms, from the per-call
// costs measured on this machine. They do not need to be exact — the point is a
// window long enough to amortise, not a particular number.
export const BATCH = {
  buildSectionsFull: 450,      // ~0.044 ms per call
  buildSectionsNarrowed: 650,  // ~0.031 ms
  conflictEntries: 180,        // ~0.11 ms
  conflictOverlaps: 165,       // ~0.12 ms
  conflictEntriesEmpty: 870,   // ~0.023 ms
} as const;
