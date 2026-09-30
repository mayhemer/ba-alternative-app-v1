// ── Sampling for the performance suite ────────────────────────────────────────
//
// Reassure's defaults are 10 runs and 1 warmup. Measured on this suite, that
// left a noise floor of up to ±14% — identical code compared against itself
// reported "changes" larger than many real regressions. 30 runs and 3 warmups
// roughly halve it, to within about ±3% typically and ±8% at worst, for about
// three times the wall clock (still well under a minute).
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
// The warmup count matters separately: the first call to buildSections costs
// ~17x the median (about 7 ms against 0.4 ms) while the Intl collator is built
// and the JIT tiers up. One warmup absorbed the worst of it; three keep it out
// of the sample reliably.
//
// None of this makes durations comparable *across machines* — they are not. Use
// render counts for that, and re-record the baseline locally.

export const MEASURE_OPTIONS = { runs: 30, warmupRuns: 3 } as const;
