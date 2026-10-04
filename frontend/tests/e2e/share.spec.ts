import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { FIXTURE_FRIEND_LABEL, FIXTURE_SHARE_TOKEN } from '../server/shareFixture';

// ── Opening a friend's share link ─────────────────────────────────────────────
//
// The link handler accepts only the canonical origin
// (https://ba.janbambas.cz/add-friend/<token>), so a link opened on the local
// test server would be ignored by design. The real origin is therefore served
// from the local build here, the same way the API origin is redirected to the
// fixture server.

const SITE = 'https://ba.janbambas.cz';
const FIRST_ARTIST = '3 INCHES OF BLOOD';

async function serveSiteFromLocalBuild(page: Page): Promise<void> {
  const local = test.info().project.use.baseURL!;
  await page.route(`${SITE}/**`, async (route) => {
    const upstream = await fetch(route.request().url().replace(SITE, local));
    await route.fulfill({
      status: upstream.status,
      contentType: upstream.headers.get('content-type') ?? 'text/html',
      body: Buffer.from(await upstream.arrayBuffer()),
    });
  });
}

test('a share link opens the friend\'s schedule', async ({ appPage }) => {
  await serveSiteFromLocalBuild(appPage);
  await appPage.goto(`${SITE}/add-friend/${FIXTURE_SHARE_TOKEN}`);

  await expect(appPage.getByText(`Viewing ${FIXTURE_FRIEND_LABEL}'s schedule`)).toBeVisible({ timeout: 20_000 });
  // The lens is on the friend: their two picks, and nobody else.
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('CRYSTAL LAKE', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText(FIRST_ARTIST, { exact: true })).toHaveCount(0);
  // The token is taken out of the address bar, so a refresh does not re-add it.
  expect(new URL(appPage.url()).pathname).toBe('/');
});

test('a revoked or unknown share link says so', async ({ appPage }) => {
  await serveSiteFromLocalBuild(appPage);
  await appPage.goto(`${SITE}/add-friend/${'f'.repeat(48)}`);

  await expect(appPage.getByText('Could not open that link')).toBeVisible({ timeout: 20_000 });
  // Nothing narrowed: the full lineup is still there.
  await expect(appPage.getByText(FIRST_ARTIST, { exact: true }).first()).toBeVisible();
});
