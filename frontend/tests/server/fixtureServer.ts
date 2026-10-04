// ── Fixture API server ────────────────────────────────────────────────────────
//
// Serves the generated fixtures on the real endpoint paths, so the app can be
// pointed at deterministic data:
//
//   EXPO_PUBLIC_API_ORIGIN=http://localhost:4010 npm run web
//
// Why a real server rather than request interception: Maestro drives an
// installed build and cannot intercept its network. Playwright could route
// requests instead, but one mock implementation shared by both layers is less
// to keep honest than two. It is also useful on its own — running the app
// against frozen data makes screenshots and demos reproducible.
//
// Host addresses differ by target: iOS simulator and web reach the host as
// `localhost`, the Android emulator as `10.0.2.2`, and a real device needs the
// machine's LAN address.
//
// Deliberately dependency-free (node:http, no framework): it serves six static
// files and one counter.

import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '../fixtures/generated');

export type FixtureServer = {
  origin: string;
  /** Advances the edition's server clock, so the next /validity reports a change. */
  bumpValidity: (slug: string, by?: number) => void;
  /** Requests seen so far, for asserting that a sync did (or did not) refetch. */
  requests: string[];
  close: () => Promise<void>;
};

type Validity = { lastSyncedAt: number; artistsSyncedAt: number };

const DATASETS = ['artists', 'categories', 'stages', 'schedule', 'bios'] as const;

function readFixture(slug: string, name: string): string | null {
  try {
    return readFileSync(join(FIXTURES, slug, `${name}.json`), 'utf8');
  } catch {
    return null;
  }
}

/**
 * Starts the server on `port` (0 picks a free one, which is what tests should
 * use so parallel runs cannot collide).
 */
export async function startFixtureServer(port = 0): Promise<FixtureServer> {
  // Validity is mutable per slug: a test bumps it to make the next poll see a
  // change, which is the only way to exercise the refresh path deterministically.
  const validity = new Map<string, Validity>();

  function validityFor(slug: string): Validity {
    const existing = validity.get(slug);
    if (existing !== undefined) {
      return existing;
    }
    const stored = readFixture(slug, 'validity');
    const parsed: Validity = stored !== null
      ? JSON.parse(stored)
      : { lastSyncedAt: 0, artistsSyncedAt: 0 };
    validity.set(slug, parsed);
    return parsed;
  }

  const requests: string[] = [];

  // While true, every API path answers 503. Lets a native E2E flow simulate a
  // device with no usable network from inside the flow (Maestro's runScript can
  // make HTTP calls from the host), instead of the runner having to stop the
  // server between flows. The app treats a failed request exactly as it treats
  // being offline: keep the cache, report nothing.
  let offline = false;

  const server: Server = createServer((req, res) => {
    const url = req.url ?? '/';
    requests.push(url);

    const send = (status: number, body: string): void => {
      res.writeHead(status, {
        'content-type': 'application/json',
        // The app is served from a different origin in the web case.
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      });
      res.end(body);
    };

    // Control endpoints, kept out of the API namespace and never served offline.
    const control = /^\/__control\/(offline|online|bump\/([^/]+))$/.exec(url);
    if (control !== null) {
      if (control[1] === 'offline') { offline = true; }
      if (control[1] === 'online') { offline = false; }
      if (control[2] !== undefined) {
        const current = validityFor(control[2]);
        validity.set(control[2], { ...current, lastSyncedAt: current.lastSyncedAt + 60_000 });
      }
      send(200, JSON.stringify({ offline }));
      return;
    }

    if (offline) {
      send(503, JSON.stringify({ error: 'fixture server is in offline mode' }));
      return;
    }

    // /{slug}/validity — no caller watermark; the client does the comparison,
    // which is what makes one cached object serve every poller in production.
    const validityMatch = /^\/([^/]+)\/validity\/?$/.exec(url);
    if (validityMatch !== null) {
      send(200, JSON.stringify(validityFor(validityMatch[1])));
      return;
    }

    const datasetMatch = /^\/([^/]+)\/([^/?]+)/.exec(url);
    if (datasetMatch !== null) {
      const [, slug, endpoint] = datasetMatch;
      if ((DATASETS as readonly string[]).includes(endpoint)) {
        const body = readFixture(slug, endpoint);
        if (body === null) {
          // An edition with no fixtures answers empty rather than 404, matching
          // a real but unpopulated slug.
          send(200, '[]');
          return;
        }
        send(200, body);
        return;
      }
    }

    send(404, JSON.stringify({ error: 'no fixture for this path', path: url }));
  });

  await new Promise<void>((resolve) => { server.listen(port, '0.0.0.0', resolve); });

  const address = server.address();
  const boundPort = typeof address === 'object' && address !== null ? address.port : port;

  return {
    origin: `http://localhost:${boundPort}`,
    bumpValidity: (slug, by = 60_000) => {
      const current = validityFor(slug);
      validity.set(slug, {
        lastSyncedAt: current.lastSyncedAt + by,
        artistsSyncedAt: current.artistsSyncedAt,
      });
    },
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => { if (err) { reject(err); } else { resolve(); } });
    }),
  };
}

// Run directly: `node --experimental-strip-types tests/server/fixtureServer.ts [port]`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4010);
  void startFixtureServer(port).then((s) => {
    console.log(`Fixture API on ${s.origin}`);
    console.log('Point the app at it with EXPO_PUBLIC_API_ORIGIN.');
  });
}
