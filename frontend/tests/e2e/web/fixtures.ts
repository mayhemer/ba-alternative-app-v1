import { test as base, type Page } from '@playwright/test';

// ── Deterministic app under test ──────────────────────────────────────────────
//
// The exported bundle has the production API origin compiled in, so every test
// redirects it to the local fixture server. The body is fetched from that
// server and fulfilled here rather than served from a second copy of the
// fixtures, so the native layer and this one share one implementation.
//
// Fulfilled rather than continued to a rewritten URL: Playwright refuses to
// change an https: request to http:, and giving the fixture server a
// certificate to satisfy that would be cost for no coverage.

const PRODUCTION_ORIGIN = 'https://api.ba.janbambas.cz';
const FIXTURE_ORIGIN = 'http://127.0.0.1:4010';

// Inside the ba2025 festival week, so "now" lands on a real programme day rather
// than months away from any event.
export const PINNED_NOW = new Date('2025-08-06T14:00:00+02:00');

/**
 * The edition the fixtures cover. The app's built-in default is the *next*
 * festival (ba2027), which has no captured data and would leave every test
 * looking at an empty but entirely healthy app.
 *
 * Seeded the way a returning user's device already has it — AsyncStorage is
 * localStorage on web — rather than by driving the Settings screen before each
 * test.
 */
export const FIXTURE_SLUG = 'ba2025';

export async function seedEdition(page: Page, slug = FIXTURE_SLUG): Promise<void> {
  // Only when nothing is stored yet: an init script runs on every load, so an
  // unconditional write would undo an edition the test itself chose, on reload.
  await page.addInitScript((value) => {
    if (window.localStorage.getItem('app:selectedSlug') === null) {
      window.localStorage.setItem('app:selectedSlug', value);
    }
  }, slug);
}

export async function useFixtureApi(page: Page): Promise<void> {
  await page.route(`${PRODUCTION_ORIGIN}/**`, async (route) => {
    const url = route.request().url().replace(PRODUCTION_ORIGIN, FIXTURE_ORIGIN);
    const upstream = await fetch(url);
    await route.fulfill({
      status: upstream.status,
      contentType: 'application/json',
      body: await upstream.text(),
    });
  });
}

/** Makes the API unreachable, to exercise the offline paths. */
export async function cutNetwork(page: Page): Promise<void> {
  await page.route(`${PRODUCTION_ORIGIN}/**`, (route) => route.abort('failed'));
}

export const test = base.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    // setSystemTime, not install(): install() also *pauses* the clock, so the
    // app's timers never fire — the startup gate's frame callback and the sync
    // scheduler both stall and the list never leaves its loading state. Nor
    // setFixedTime(): it freezes Date.now() outright, and the timeline throttles
    // its scroll persistence on Date.now() differences — frozen, every write after
    // the first is dropped. This starts the clock at PINNED_NOW (the timeline
    // picks its day from it) and lets both time and timers run normally.
    await page.clock.setSystemTime(PINNED_NOW);
    await seedEdition(page);
    await useFixtureApi(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
