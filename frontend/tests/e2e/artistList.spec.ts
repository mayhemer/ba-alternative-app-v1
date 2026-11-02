import { expect, test } from './fixtures';
import { closeSearch, searchFor, searchResult } from './search';

// ── Artist list interactions ──────────────────────────────────────────────────

const FIRST_ARTIST = '3 INCHES OF BLOOD';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
}

test('search finds a band and opens it over the results', async ({ appPage }) => {
  await ready(appPage);
  await searchFor(appPage, 'mastodon');
  await expect(searchResult(appPage, 'MASTODON')).toBeVisible();

  await searchResult(appPage, 'MASTODON').click();

  // The artist sheet opens over the results, which stay for the next pick.
  await expect(appPage.getByText('✕', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByTestId('search-input')).toBeVisible();
});

test('closing the search leaves the list as it was', async ({ appPage }) => {
  await ready(appPage);
  await searchFor(appPage, 'mastodon');
  await closeSearch(appPage);

  await expect(appPage.getByTestId('search-input')).toHaveCount(0);
  await expect(appPage.getByText(FIRST_ARTIST, { exact: false }).first()).toBeVisible();
});

test('a search matching nothing says so rather than looking broken', async ({ appPage }) => {
  await ready(appPage);
  await searchFor(appPage, 'zzzzzzzz-no-such-band');

  await expect(appPage.getByText('Nothing found for “zzzzzzzz-no-such-band”', { exact: true })).toBeVisible();
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

// ── The star selector ─────────────────────────────────────────────────────────
//
// A star press turns the pick one step and opens the selector beside the star,
// apart from it: the four states to its left, the star left uncovered.

const STATES = ['Not marked', 'Maybe', 'Must see!', "Don't go"];

test('the star selector opens beside the pressed star, leaving it uncovered @layout', async ({ appPage }) => {
  await ready(appPage);
  const star = appPage.getByLabel('Toggle interest').filter({ visible: true }).first();
  const starBox = (await star.boundingBox())!;

  await star.click();

  const selector = appPage.getByTestId('star-selector');
  const selectorBox = (await selector.boundingBox())!;
  // Left of the star, apart from it, centred on it.
  expect(selectorBox.x + selectorBox.width).toBeLessThan(starBox.x);
  expect(Math.abs(selectorBox.y + selectorBox.height / 2 - (starBox.y + starBox.height / 2))).toBeLessThanOrEqual(1);
  // The four states, in tap order, left of the star with room between.
  const boxes = await Promise.all(STATES.map(async (s) => (await selector.getByLabel(s, { exact: true }).boundingBox())!));
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
  }
  expect(starBox.x - (boxes[3].x + boxes[3].width)).toBeGreaterThanOrEqual(39);
  // Within the screen.
  expect(selectorBox.x).toBeGreaterThanOrEqual(0);
});

test('pressing the star again keeps the selector open, without a blink', async ({ appPage }) => {
  await ready(appPage);
  const star = appPage.getByLabel('Toggle interest').filter({ visible: true }).first();
  await star.click();
  const before = await appPage.getByTestId('star-selector').elementHandle();

  await star.click();

  // The same element: it was neither closed nor drawn again from scratch.
  expect(await before!.evaluate((el) => el.isConnected)).toBe(true);
  await expect(appPage.getByTestId('star-selector-info')).toHaveText('Must see!✓');
});

test('a state tapped in the selector is the pick', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByLabel('Toggle interest').filter({ visible: true }).first().click();

  await appPage.getByTestId('star-selector').getByLabel('Must see!', { exact: true }).click();

  await expect(appPage.getByTestId('star-selector-info')).toHaveText('Must see!✓');
  const stored = await appPage.evaluate(() => window.localStorage.getItem('user:interests:v2:ba2025'));
  expect(stored).toContain('will_go');
});

test('the star selector closes by itself', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByLabel('Toggle interest').filter({ visible: true }).first().click();
  await expect(appPage.getByTestId('star-selector')).toBeVisible();

  await expect(appPage.getByTestId('star-selector')).toHaveCount(0, { timeout: 3_000 });
});

test('a tap elsewhere in the list closes the selector and still does its job', async ({ appPage }) => {
  await ready(appPage);
  const stars = appPage.getByLabel('Toggle interest').filter({ visible: true });
  await stars.nth(0).click();
  const secondBox = (await stars.nth(1).boundingBox())!;

  // The next row's star: it turns, and the selector moves to it.
  await stars.nth(1).click();

  // The old selector closes on the touch, the new one opens once the star is measured.
  await expect.poll(async () => {
    const box = await appPage.getByTestId('star-selector').boundingBox();
    return box === null ? Infinity : Math.abs(box.y + box.height / 2 - (secondBox.y + secondBox.height / 2));
  }).toBeLessThanOrEqual(1);
});

test('the star selector goes away when the list scrolls', async ({ appPage }) => {
  await ready(appPage);
  const star = appPage.getByLabel('Toggle interest').filter({ visible: true }).first();
  await star.click();
  await expect(appPage.getByTestId('star-selector')).toBeVisible();

  // Over the list, by a band's name (left of the selector).
  await appPage.getByText(FIRST_ARTIST, { exact: false }).filter({ visible: true }).first().hover();
  await appPage.mouse.wheel(0, 400);

  // Well before it would close by itself.
  await expect(appPage.getByTestId('star-selector')).toHaveCount(0, { timeout: 1_000 });
});

test('in the artist sheet a tap elsewhere closes the selector and still does its job @layout', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByText(FIRST_ARTIST, { exact: false }).filter({ visible: true }).first().click();
  // The sheet's star is the last one in the tree, above the list.
  await appPage.getByLabel('Toggle interest').filter({ visible: true }).last().click();
  await expect(appPage.getByTestId('star-selector')).toBeVisible();

  // Nothing is dimmed, so the sheet's ✕ is reachable at once, and closes it.
  await appPage.getByText('✕', { exact: true }).filter({ visible: true }).first().click();

  await expect(appPage.getByTestId('star-selector')).toHaveCount(0);
  await expect(appPage.getByText('✕', { exact: true }).filter({ visible: true })).toHaveCount(0);
});
