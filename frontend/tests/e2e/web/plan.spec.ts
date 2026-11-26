import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { closeSearch, searchFor, searchResult } from './search';

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

/** Marks an artist a must-see: found by search, starred in its sheet, both closed again. */
async function mustSee(page: Page, query: string): Promise<void> {
  await searchFor(page, query);
  await searchResult(page, query.toUpperCase()).click();
  // The sheet's star is the last one in the tree. One press is Maybe and opens
  // the selector; Must-see is picked in it.
  await page.getByLabel('Toggle interest').filter({ visible: true }).last().click();
  await page.getByTestId('star-selector').getByLabel('I must see this!', { exact: true }).click();
  await page.getByText('✕', { exact: true }).filter({ visible: true }).first().click();
  await closeSearch(page);
}

async function pickClashingPair(page: Page): Promise<void> {
  await mustSee(page, 'crystal lake');
  await mustSee(page, 'exorcizphobia');
}

test('the now pill shows the live must-see and opens the plan', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);

  // On the artist list, the top bar already tells what is on now.
  const pill = appPage.getByTestId('now-pill');
  await expect(pill).toBeVisible();
  await expect(pill.getByText('CRYSTAL LAKE', { exact: false })).toBeVisible();
  // No status word on screen: the red dot shows it; the label still says it.
  await expect(pill).toHaveAccessibleName(/LIVE/);

  await pill.click();

  // My plan, today, with both sets and the clash between them.
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('Conflict', { exact: true })).toBeVisible();
  // EXORCIZPHOBIA starts during the live set: it counts down to its start.
  await expect(appPage.getByText('START', { exact: true })).toBeVisible();
});

test('the conflict title opens the clash on a timeline of its own', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  await appPage.getByTestId('now-pill').click();

  await appPage.getByText('Conflict', { exact: true }).click();
  const sheet = appPage.getByTestId('conflict-timeline');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('CRYSTAL LAKE', { exact: false }).first()).toBeVisible();
  await expect(sheet.getByText('EXORCIZPHOBIA', { exact: false }).first()).toBeVisible();
  // The clash is shorter than the sheet is wide: its range widens to fill it.
  // It is measured first, so allow the layout pass to land.
  const range = appPage.getByTestId('conflict-timeline-range');
  await expect.poll(async () => {
    const sheetBox = await sheet.boundingBox();
    const rangeBox = await range.boundingBox();
    return Math.round((rangeBox?.width ?? 0) - (sheetBox?.width ?? -1));
  }).toBe(0);

  await appPage.getByLabel('Close conflict').click();
  await expect(sheet).toHaveCount(0);
});

test('each clash bar clips its stripes to its own bar', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  await appPage.getByTestId('now-pill').click();
  await expect(appPage.getByTestId('plan-clash-bar')).toHaveCount(2, { timeout: 20_000 });

  // SVG ids are global to a web page: a clip id two bars share resolves to the
  // first bar's clip, cutting every later bar's stripes to its size.
  const ownClips = await appPage.getByTestId('plan-clash-bar').evaluateAll((bars) => bars.map((bar) => {
    const url = bar.querySelector('path')?.getAttribute('clip-path') ?? '';
    const id = /url\(#(.+)\)/.exec(url)?.[1] ?? '';
    return id !== '' && bar.contains(document.getElementById(id));
  }));
  expect(ownClips).toEqual([true, true]);
});

test('switches days and filters to conflicts only', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  await appPage.getByText('My plan', { exact: false }).first().click();
  // My plan, today: the clash between the two picks.
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });

  // Another day: nothing picked there.
  await appPage.getByText('Thu', { exact: true }).click();
  await expect(appPage.getByText('Nothing picked for this day')).toBeVisible();
  await appPage.getByText('Wed', { exact: true }).click();

  // A filter button applies and closes the panel itself.
  await appPage.getByLabel('Filters').click();
  await appPage.getByRole('button', { name: 'Only conflicts' }).click();
  await expect(appPage.getByRole('button', { name: 'Only conflicts' })).toHaveCount(0);

  await expect(appPage.getByText('CRYSTAL LAKE', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  // No gaps in this mode.
  await expect(appPage.getByTestId('plan-gap')).toHaveCount(0);
});

/**
 * My plan measures its height (onLayout) and lands about 100 ms after it
 * shows. A tap or scroll faster than any person's would come before that.
 */
async function letPlanLand(page: Page): Promise<void> {
  await page.waitForTimeout(300);
}

/** Waits until the list stops scrolling. */
async function letListSettle(list: Locator): Promise<void> {
  let last = -1;
  await expect.poll(async () => {
    const y = await list.evaluate((el) => el.scrollTop);
    const still = y === last;
    last = y;
    return still;
  }, { intervals: [200] }).toBe(true);
}

test('on My plan with now in view, the now pill stays on My plan at now', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await letPlanLand(appPage);

  // A tap never switches to a timeline: still My plan, today, at now.
  await pill.click();
  await letPlanLand(appPage);
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeInViewport();
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
});

test('in a break, the now pill on My plan stays on My plan at now', async ({ appPage }) => {
  await ready(appPage);
  // At 14:00 MINISTRY (22:20) is hours away: the pill counts down to it.
  await mustSee(appPage, 'ministry');
  const pill = appPage.getByTestId('now-pill');
  await expect(pill).toHaveAccessibleName(/MINISTRY START/);
  await pill.click();
  await expect(appPage.getByText('MINISTRY', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await letPlanLand(appPage);

  await pill.click();
  await letPlanLand(appPage);
  await expect(appPage.getByTestId('plan-now-arrow').filter({ visible: true }).first()).toBeInViewport();
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
});

test('on My plan scrolled away from now, the now pill scrolls back to now, every time', async ({ appPage }) => {
  await ready(appPage);
  // Wednesday's evening on top of the live clash: a day taller than the
  // screen, so the now arrow can scroll out of view.
  for (const query of ['dope', 'thrown', 'dark angel', 'dying fetus', 'zemial', 'ministry']) {
    await mustSee(appPage, query);
  }
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await letPlanLand(appPage);

  const list = appPage.getByTestId('plan-list').filter({ visible: true });
  const end = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
  for (let round = 0; round < 2; round++) {
    await list.evaluate((el, y) => { el.scrollTop = y; }, end);
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(end);
    await expect(appPage.getByTestId('plan-clash-bar').first()).not.toBeInViewport();

    // The pill scrolls My plan back to now, and stays on it.
    await pill.click();
    await expect(appPage.getByTestId('plan-clash-bar').first()).toBeInViewport();
    await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
    await letListSettle(list);

    // A next tap, with now in view: still My plan at now.
    await pill.click();
    await letPlanLand(appPage);
    await expect(appPage.getByTestId('plan-clash-bar').first()).toBeInViewport();
    await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
  }
});

test('from a timeline, the now pill opens My plan at now', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  await appPage.getByText('Program', { exact: true }).filter({ visible: true }).first().click();
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toBeVisible({ timeout: 20_000 });

  await appPage.getByTestId('now-pill').click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeInViewport({ timeout: 20_000 });
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
});

test('on My plan showing another day, the now pill goes to today at now, not the timeline', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await appPage.getByText('Thu', { exact: true }).filter({ visible: true }).click();
  await expect(appPage.getByText('Nothing picked for this day')).toBeVisible();

  // Thursday is not today: My plan again, back on Wednesday with the live set.
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible();
  await expect(appPage.getByText('Nothing picked for this day')).toHaveCount(0);
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
});
