import { expect, test } from './fixtures';

// ── Artist list interactions ──────────────────────────────────────────────────

const FIRST_ARTIST = '3 INCHES OF BLOOD';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
}

test('search narrows the list', async ({ appPage }) => {
  await ready(appPage);
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible();

  await appPage.getByPlaceholder('Search artists…').fill('mastodon');

  // Narrowing brings a name in from far down the collated order, which is also
  // the path that re-runs the grouping and its collated sort on every keystroke.
  await expect(appPage.getByText('MASTODON', { exact: false }).first()).toBeVisible();
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false })).toHaveCount(0);
});

test('clearing the search restores the full list', async ({ appPage }) => {
  await ready(appPage);
  const search = appPage.getByPlaceholder('Search artists…');

  await search.fill('mastodon');
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false })).toHaveCount(0);
  await search.fill('');

  await expect(appPage.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible();
});

test('a search matching nothing says so rather than looking broken', async ({ appPage }) => {
  await ready(appPage);

  await appPage.getByPlaceholder('Search artists…').fill('zzzzzzzz-no-such-band');

  // An empty result is an answer, not a wait — the list must not fall back to
  // its loading state.
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0);
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false })).toHaveCount(0);
  await expect(appPage.getByText('No artists found', { exact: true })).toBeVisible();
});

test('a star survives a reload', async ({ appPage }) => {
  await ready(appPage);

  const star = appPage.getByLabel('Toggle interest').first();
  await star.click();

  // Local-first: the pick is stored on the device before any account exists,
  // and a reload is the cheapest proof it was persisted rather than held in state.
  await appPage.reload();
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });

  const stored = await appPage.evaluate(
    () => window.localStorage.getItem('user:interests:v2:ba2025'));
  expect(stored).not.toBeNull();
  expect(Object.keys(JSON.parse(stored!)).length).toBeGreaterThan(0);
});

test('a share link opens the app rather than 404ing', async ({ appPage }) => {
  // The SPA fallback the deploy relies on: /add-friend/<token> is not a file.
  const response = await appPage.goto('/add-friend/deadbeef');

  expect(response?.status()).toBe(200);
  await expect(appPage.getByText('Artists', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
});

// ── The star toast ────────────────────────────────────────────────────────────
//
// A star tap shows the interest cycle in a toast while the user may tap on.
// Whatever the viewport, the toast must not land on any star button — in the
// list, or in the artist sheet's header, which sits right where the toast does.

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function expectToastClearOfStars(page: import('@playwright/test').Page): Promise<void> {
  const toast = page.getByTestId('feedback-toast');
  await expect(toast).toBeVisible();
  const toastBox = (await toast.boundingBox())!;
  const stars = page.getByLabel('Toggle interest').filter({ visible: true });
  for (const star of await stars.all()) {
    const starBox = await star.boundingBox();
    if (starBox !== null) {
      expect(overlaps(toastBox, starBox), `toast ${JSON.stringify(toastBox)} covers star ${JSON.stringify(starBox)}`).toBe(false);
    }
  }
}

test('the star toast stays clear of the list stars @layout', async ({ appPage }) => {
  await ready(appPage);

  await appPage.getByLabel('Toggle interest').filter({ visible: true }).first().click();

  await expectToastClearOfStars(appPage);
});

test('the star toast is centred when there is room for it @layout', async ({ appPage }) => {
  await ready(appPage);

  await appPage.getByLabel('Toggle interest').filter({ visible: true }).first().click();

  const toast = (await appPage.getByTestId('feedback-toast').boundingBox())!;
  const viewportWidth = appPage.viewportSize()!.width;
  expect(Math.abs(toast.x + toast.width / 2 - viewportWidth / 2)).toBeLessThanOrEqual(1);
});

test('the star toast stays clear of the artist sheet star @layout', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByText(FIRST_ARTIST, { exact: false }).filter({ visible: true }).first().click();

  // The sheet's star is the last one in the tree, above the list.
  await appPage.getByLabel('Toggle interest').filter({ visible: true }).last().click();

  await expectToastClearOfStars(appPage);
});
