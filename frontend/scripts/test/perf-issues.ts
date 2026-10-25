// ── Render-issues record, a second baseline that only warns ──────────────────
//
//   npm run test:perf:issues               (part of npm run test:perf)
//   npm run test:perf:issues -- --record   (part of npm run test:perf:baseline)
//
// Reassure flags two render issues per scenario: initial updates (renders right
// after mount) and redundant updates (a commit whose output is identical to the
// previous one, listed by render index). baseline.perf carries them, but it is
// re-recorded whenever durations need refreshing, which silently absorbs any
// change to them. This keeps them in their own small committed file, one line
// per scenario that has any, so a change shows up in review on its own.
//
// --record writes .reassure/render-issues.json from .reassure/baseline.perf, so
// it follows a `reassure --baseline` run. Without it, the last run
// (.reassure/current.perf) is compared against the record, and every scenario
// whose issues differ — worse or better, or the same count at other renders — is
// a warning. Never a failure: gating is perf-gate.ts's job.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE = join(ROOT, '.reassure', 'baseline.perf');
const CURRENT = join(ROOT, '.reassure', 'current.perf');
const RECORD = join(ROOT, '.reassure', 'render-issues.json');

type Issues = { initialUpdateCount: number; redundantUpdates: number[] };
type Entry = { name: string; type: 'render' | 'function'; issues?: Partial<Issues> };
type IssueRecord = { [name: string]: Issues };

const at = (path: string): string => relative(ROOT, path);

// A .perf file is JSON lines: a metadata header, then one line per scenario.
function readIssues(path: string): IssueRecord {
  const issues: IssueRecord = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') { continue; }
    const entry = JSON.parse(line) as Partial<Entry>;
    if (entry.type !== 'render' || entry.name === undefined) { continue; }
    const found: Issues = {
      initialUpdateCount: entry.issues?.initialUpdateCount ?? 0,
      redundantUpdates: entry.issues?.redundantUpdates ?? [],
    };
    if (found.initialUpdateCount > 0 || found.redundantUpdates.length > 0) {
      issues[entry.name] = found;
    }
  }
  return issues;
}

// Reassure's own notation: a count, then the render indices in brackets.
function describe(issues: Issues | undefined): string {
  if (issues === undefined) { return 'none'; }
  const parts: string[] = [];
  if (issues.initialUpdateCount > 0) { parts.push(`initial ${issues.initialUpdateCount}`); }
  if (issues.redundantUpdates.length > 0) {
    parts.push(`redundant ${issues.redundantUpdates.length} (${issues.redundantUpdates.join(', ')})`);
  }
  return parts.join(', ');
}

if (process.argv.includes('--record')) {
  if (!existsSync(BASELINE)) {
    console.error(`no baseline at ${at(BASELINE)} — run \`npm run test:perf:baseline\``);
    process.exit(1);
  }
  const issues = readIssues(BASELINE);
  const names = Object.keys(issues).sort();
  const lines = names.map((name) => `  ${JSON.stringify(name)}: ${JSON.stringify(issues[name])}`);
  writeFileSync(RECORD, names.length === 0 ? '{}\n' : `{\n${lines.join(',\n')}\n}\n`);
  console.log(`recorded render issues of ${names.length} scenarios in ${at(RECORD)}`);
  process.exit(0);
}

if (!existsSync(CURRENT)) {
  console.error(`no measurement at ${at(CURRENT)} — run \`npm run test:perf\` first`);
  process.exit(1);
}
if (!existsSync(RECORD)) {
  console.warn(`⚠ no render-issues record at ${at(RECORD)} — record one with \`npm run test:perf:baseline\``);
  process.exit(0);
}

const recorded = JSON.parse(readFileSync(RECORD, 'utf8')) as IssueRecord;
const current = readIssues(CURRENT);
const names = [...new Set([...Object.keys(recorded), ...Object.keys(current)])].sort();

const diverged = names.filter((name) =>
  JSON.stringify(recorded[name] ?? null) !== JSON.stringify(current[name] ?? null));

if (diverged.length > 0) {
  console.warn(`\n⚠ render issues differ from ${at(RECORD)}:`);
  for (const name of diverged) {
    console.warn(`  ${describe(recorded[name])} → ${describe(current[name])}: ${name}`);
  }
  console.warn('\nWhether worse or better, find out why. If the change is intended, re-record '
    + '(npm run test:perf:baseline) and say why in the commit.');
  process.exit(0);
}

console.log(`✓ render issues match the record (${names.length} scenarios with issues)`);
