// Starts both servers the web E2E run needs, on fixed ports so Playwright's
// config can name them. Used as playwright.config.ts's `webServer` command.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from './fixtureServer.ts';
import { startStaticServer } from './staticServer.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

export const APP_PORT = 4009;
export const API_PORT = 4010;

const app = await startStaticServer(join(HERE, '../../dist'), APP_PORT);
const api = await startFixtureServer(API_PORT);

console.log(`app ${app.origin}`);
console.log(`api ${api.origin}`);
