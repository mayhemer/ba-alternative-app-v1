import { defineConfig, devices } from '@playwright/test';

// ── Web E2E ───────────────────────────────────────────────────────────────────
//
// Runs against the *exported* build (`npm run build:web`), not the dev server,
// so what is tested is what ships.
//
// Both servers are started by `webServer` below: the static host for dist/, and
// the fixture API. The app bundle has the production origin compiled into it,
// so each test redirects that origin to the fixture API with page.route (see
// tests/e2e/fixtures.ts) — which means no special build is needed here. Maestro
// cannot do that, which is why the app also accepts EXPO_PUBLIC_API_ORIGIN.
//
// Scope note: this layer is for web-specific correctness. It is not a
// performance signal — the browser runs V8 with a JIT and renders to the DOM,
// where the app's expensive work (native view creation, Hermes' Intl) does not
// exist in the same shape.

const APP_PORT = 4009;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node --experimental-strip-types --no-warnings tests/server/e2eServers.ts',
    url: `http://127.0.0.1:${APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
