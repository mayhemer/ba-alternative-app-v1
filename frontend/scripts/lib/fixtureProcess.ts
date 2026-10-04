// ── The fixture API in its own process ────────────────────────────────────────
//
// The device runners spend most of their time in synchronous child processes —
// `maestro test` for the whole suite, `adb` for every measurement. A server
// living in the runner's own Node process cannot answer while those block its
// event loop: the first iOS run lost five minutes per flow to Maestro's own
// control call hanging, and the app's API requests would have hung the same
// way. On the Android side it would quietly have skewed cold-start timing,
// since `am start -W` blocks for the seconds the app spends making its first
// requests. In a separate process, nothing the runner does can starve it.

import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './proc.ts';

const SERVER = join(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'tests', 'server', 'fixtureServer.ts');

export type FixtureProcess = {
  origin: string;
  /** API paths the app has requested so far (control calls excluded). */
  requests: () => Promise<string[]>;
  close: () => void;
};

export async function startFixtureProcess(port = 4010): Promise<FixtureProcess> {
  const origin = `http://localhost:${port}`;
  // Refuse to share the port: a stale server from an earlier run would serve
  // the wrong state and make every result here a lie.
  if (await reachable(origin)) {
    throw new Error(`something is already listening on :${port} — stop it (e.g. a running \`npm run serve:fixtures\`)`);
  }

  const child: ChildProcess = spawn(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', SERVER, String(port)],
    { stdio: 'ignore' },
  );
  const close = (): void => { if (child.exitCode === null) { child.kill(); } };
  process.on('exit', close);

  for (let i = 0; i < 50; i++) {
    if (await reachable(origin)) {
      return {
        origin,
        requests: async () => (await (await fetch(`${origin}/__control/requests`)).json()) as string[],
        close,
      };
    }
    await sleep(100);
  }
  close();
  throw new Error(`the fixture API did not come up on :${port}`);
}

async function reachable(origin: string): Promise<boolean> {
  try {
    const r = await fetch(`${origin}/__control/online`, { signal: AbortSignal.timeout(500) });
    return r.ok;
  } catch {
    return false;
  }
}
