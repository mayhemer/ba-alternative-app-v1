import { cutNetwork, expect, FIXTURE_SLUG, seedEdition, test } from './fixtures';

// ── Startup ───────────────────────────────────────────────────────────────────

// First playable artist in the list's collated order, so it is inside the
// virtualized window on the first paint.
const FIRST_ARTIST = '3 INCHES OF BLOOD';

test('opens on the artist list with the edition\'s lineup', async ({ appPage }) => {
  await appPage.goto('/');

  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
  // A real name from the captured ba2025 lineup — proves the fixtures reached
  // the list, not merely that the shell rendered. Chosen from the top of the
  // collated order because the list is virtualized: anything further down is
  // not mounted yet and would fail for the wrong reason.
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible();
});

test('reaches every main section', async ({ appPage }) => {
  await appPage.goto('/');
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });

  for (const section of ['Program', 'Support Program', 'Conflicts', 'Settings']) {
    await appPage.getByText(section, { exact: true }).first().click();
    await expect(appPage.getByText(section, { exact: true }).first()).toBeVisible();
  }
});

test('opens on cached data when the network is gone', async ({ page }) => {
  // First visit fills the cache…
  await page.clock.setFixedTime(new Date('2025-08-06T14:00:00+02:00'));
  await seedEdition(page);
  const { useFixtureApi } = await import('./fixtures');
  await useFixtureApi(page);
  await page.goto('/');
  await expect(page.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });

  // …then the network disappears and the app is restarted.
  await page.unrouteAll();
  await cutNetwork(page);
  await page.reload();

  // The whole point of persisting the cache: a cold start with no connectivity
  // opens on the last known schedule rather than the error screen.
  await expect(page.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
});

test('persists the chosen edition across a reload', async ({ appPage }) => {
  await appPage.goto('/');
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });

  const stored = await appPage.evaluate(() => window.localStorage.getItem('app:selectedSlug'));
  expect(stored).toBe(FIXTURE_SLUG);
});
