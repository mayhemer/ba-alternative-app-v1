import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// ── My plan ───────────────────────────────────────────────────────────────────
//
// The clock is pinned to Wednesday 6 Aug 2025, 14:00 (fixtures.PINNED_NOW). In
// the ba2025 capture CRYSTAL LAKE plays 14:00–14:40 and EXORCIZPHOBIA 14:30–15:05
// on another stage: picking both as must-sees gives a live set, a clash, and an
// upcoming set that starts during it.

async function ready(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
}

/** Marks an artist a must-see from the list: two star presses. */
async function mustSee(page: Page, query: string): Promise<void> {
  await page.getByTestId('artist-search').fill(query);
  const star = page.getByLabel('Toggle interest').filter({ visible: true }).first();
  await star.click();
  await star.click();
}

async function pickClashingPair(page: Page): Promise<void> {
  await mustSee(page, 'crystal lake');
  await mustSee(page, 'exorcizphobia');
  await page.getByTestId('artist-search').fill('');
}

test('the now pill shows the live must-see and opens the plan', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);

  // On the artist list, the top bar already tells what is on now.
  const pill = appPage.getByTestId('now-pill');
  await expect(pill).toBeVisible();
  await expect(pill.getByText('CRYSTAL LAKE', { exact: false })).toBeVisible();
  await expect(pill.getByText('LIVE')).toBeVisible();

  await pill.click();

  // My plan, today, with both sets and the clash between them.
  await expect(appPage.getByText('Wednesday', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('Conflict', { exact: true })).toBeVisible();
  // EXORCIZPHOBIA starts during the live set: it counts down to its start.
  await expect(appPage.getByText('START', { exact: true })).toBeVisible();
});

test('switches days and filters to conflicts only', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  await appPage.getByText('My plan', { exact: false }).first().click();
  await expect(appPage.getByText('Wednesday', { exact: true })).toBeVisible({ timeout: 20_000 });

  // Another day: nothing picked there.
  await appPage.getByText('Thu', { exact: true }).click();
  await expect(appPage.getByText('Nothing planned for this day')).toBeVisible();
  await appPage.getByText('Wed', { exact: true }).click();

  await appPage.getByLabel('Filters').click();
  await appPage.getByRole('switch', { name: 'Show only conflicts' }).click();
  await appPage.getByLabel('Close').click();

  await expect(appPage.getByText('CRYSTAL LAKE', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  // No gaps in this mode.
  await expect(appPage.getByTestId('plan-gap')).toHaveCount(0);
});
