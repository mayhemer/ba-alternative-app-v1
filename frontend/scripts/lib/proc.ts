// ── Process helpers for the device test runners ───────────────────────────────

import { spawnSync, type SpawnSyncOptions } from 'node:child_process';

export type RunResult = { ok: boolean; code: number; out: string; err: string };

/** Runs a command to completion and captures its output. Never throws. */
export function run(cmd: string, args: string[], opts: SpawnSyncOptions = {}): RunResult {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return {
    ok: r.status === 0,
    code: r.status ?? -1,
    out: String(r.stdout ?? '').trim(),
    err: String(r.stderr ?? '').trim(),
  };
}

/** Runs a command and returns stdout, or throws with its stderr. */
export function must(cmd: string, args: string[], opts: SpawnSyncOptions = {}): string {
  const r = run(cmd, args, opts);
  if (!r.ok) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.code}): ${r.err || r.out}`);
  }
  return r.out;
}

export function has(cmd: string): boolean {
  return run('sh', ['-c', `command -v ${cmd}`]).ok;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });

// Exit codes shared by the runners, so `verify` can tell a skip from a failure.
export const EXIT = { PASS: 0, FAIL: 1, SKIPPED: 4 } as const;

export function skip(reason: string, hint?: string): never {
  console.log(`\n\x1b[33mSKIPPED\x1b[0m — ${reason}`);
  if (hint !== undefined) {
    console.log(`  ${hint}`);
  }
  process.exit(EXIT.SKIPPED);
}

/** Minimal `--flag value` / `--flag` parser; good enough for these runners. */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[a.slice(2)] = next;
      i++;
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}
