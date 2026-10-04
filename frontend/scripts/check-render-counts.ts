// ── Render-count gate over the last Reassure comparison ──────────────────────
//
//   node --experimental-strip-types scripts/check-render-counts.ts
//
// Reassure's compare step only *reports*: it exits 0 however far a scenario
// regressed, so on its own the performance suite can never fail a run. This
// turns the one metric that is safe to gate on into a failure.
//
// Gated:
//   - a render count that went up (counts are deterministic and identical on any
//     machine — a higher one means a memo or a context dependency stopped
//     skipping work);
//   - more redundant renders than the baseline had (a commit whose output is
//     identical to the previous one).
//
// Not gated: durations. They drift with machine load (tests/setup/perfOptions.ts
// has the measurements), so they stay in the report for a human to read.
//
// A count that went *down* passes, with a reminder to re-record the baseline so
// the improvement is held from then on.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, '.reassure', 'output.json');

type Issues = { initialUpdateCount?: number; redundantUpdates?: number[] };
type Measured = { meanCount: number; issues?: Issues };
type Compared = { name: string; type: 'render' | 'function'; baseline: Measured; current: Measured };
type Added = { name: string; type: 'render' | 'function'; current: Measured };
type Output = { significant: Compared[]; meaningless: Compared[]; added: Added[] };

if (!existsSync(OUTPUT)) {
  console.error(`no comparison at ${OUTPUT} — run \`npm run test:perf\` first`);
  process.exit(1);
}

const output = JSON.parse(readFileSync(OUTPUT, 'utf8')) as Output;
const compared = [...output.significant, ...output.meaningless].filter((e) => e.type === 'render');

const redundant = (m: Measured): number => m.issues?.redundantUpdates?.length ?? 0;

const failures: string[] = [];
const improved: string[] = [];

for (const e of compared) {
  const before = e.baseline.meanCount;
  const after = e.current.meanCount;
  if (after > before) {
    failures.push(`renders ${before} → ${after}: ${e.name}`);
  } else if (after < before) {
    improved.push(`renders ${before} → ${after}: ${e.name}`);
  }
  if (redundant(e.current) > redundant(e.baseline)) {
    failures.push(`redundant renders ${redundant(e.baseline)} → ${redundant(e.current)}: ${e.name}`);
  }
}

for (const e of output.added.filter((a) => a.type === 'render')) {
  console.log(`new scenario, no baseline yet (${e.current.meanCount} renders): ${e.name}`);
}

if (improved.length > 0) {
  console.log(`\nFewer renders than the baseline — re-record it (npm run test:perf:baseline) to hold the gain:`);
  for (const line of improved) { console.log(`  ${line}`); }
}

if (failures.length > 0) {
  console.error('\n✖ render counts regressed:');
  for (const line of failures) { console.error(`  ${line}`); }
  console.error('\nSomething re-renders more than it did. If the extra render is intended, '
    + 're-record the baseline and say why in the commit.');
  process.exit(1);
}

console.log(`✓ render counts held across ${compared.length} scenarios`);
