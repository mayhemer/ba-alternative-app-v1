// ── Static server for the exported web build ──────────────────────────────────
//
// Serves `dist/` the way the real host does, including the SPA fallback that
// lets /add-friend/<token> reach the app instead of 404ing. Deliberately
// dependency-free, and deliberately mirrors public/.htaccess: `.well-known`
// must stay a 404 when absent rather than becoming HTML, because a malformed
// apple-app-site-association is worse than a missing one.

import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export type StaticServer = { origin: string; close: () => Promise<void> };

export async function startStaticServer(root: string, port = 0): Promise<StaticServer> {
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    // normalize + the root prefix check keeps `../` out of the served tree.
    const candidate = normalize(join(root, decodeURIComponent(path)));
    if (!candidate.startsWith(normalize(root))) {
      res.writeHead(403).end('forbidden');
      return;
    }

    const file = existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : join(root, 'index.html');

    // A missing .well-known file stays a 404 — never the SPA shell.
    if (file !== candidate && path.startsWith('/.well-known')) {
      res.writeHead(404).end('not found');
      return;
    }

    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }

    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });

  await new Promise<void>((resolve) => { server.listen(port, '127.0.0.1', resolve); });
  const address = server.address();
  const bound = typeof address === 'object' && address !== null ? address.port : port;

  return {
    origin: `http://127.0.0.1:${bound}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => { if (err) { reject(err); } else { resolve(); } });
    }),
  };
}
