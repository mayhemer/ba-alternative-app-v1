import { cutNetwork, expect, seedEdition, test } from './fixtures';

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

  // Each section is recognised by content only it has — the drawer label stays
  // visible whether or not the click navigated. The clock is pinned to
  // Wednesday 6 Aug 2025, whose main programme has a "Marshall" lane and whose
  // support programme has an "Exhibition" lane; neither exists in the other.
  const sections: [label: string, proof: string][] = [
    ['Program', 'Marshall'],
    ['Support Program', 'Exhibition'],
    ['Conflicts', 'No conflicts in your schedule.'],
    ['Settings', 'Active'],
  ];
  for (const [label, proof] of sections) {
    await appPage.getByText(label, { exact: true }).first().click();
    await expect(appPage.getByText(proof, { exact: true }).filter({ visible: true }).first())
      .toBeVisible({ timeout: 20_000 });
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

  // …then the network disappears and the app is restarted. 'wait' lets requests
  // still being fetched from the fixture server finish first: removed mid-fetch,
  // their handler fulfils a route the reload has already cancelled, and that
  // error fails the test (about 1 run in 10).
  await page.unrouteAll({ behavior: 'wait' });
  await cutNetwork(page);
  await page.reload();

  // The whole point of persisting the cache: a cold start with no connectivity
  // opens on the last known schedule rather than the error screen.
  await expect(page.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
});

test('persists the chosen edition across a reload', async ({ appPage }) => {
  await appPage.goto('/');
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });

  await appPage.getByText('Settings', { exact: true }).first().click();
  await appPage.getByText('BA2024', { exact: true }).click();
  await appPage.getByText('Artists', { exact: true }).first().click();
  // A name only the 2024 lineup has.
  await expect(appPage.getByText('1914', { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  await appPage.reload();

  await expect(appPage.getByText('1914', { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false })).toHaveCount(0);
  const stored = await appPage.evaluate(() => window.localStorage.getItem('app:selectedSlug'));
  expect(stored).toBe('ba2024');
});
