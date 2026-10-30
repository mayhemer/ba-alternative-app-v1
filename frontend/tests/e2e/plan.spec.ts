import { expect, PINNED_NOW, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { eventScrollTarget } from '../../src/features/timeline/timelineLayout';

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
  await expect(appPage.getByText('Nothing planned for this day')).toBeVisible();
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

const WED = Date.parse('2025-08-06T06:00:00+02:00');

/**
 * My plan measures its height (onLayout) and lands about 100 ms after it
 * shows; until then it cannot tell whether now is in view. A tap or scroll
 * faster than any person's would come before that.
 */
async function letPlanLand(page: Page): Promise<void> {
  await page.waitForTimeout(300);
}

/** Waits until the visible timeline is scrolled to now, as the today button puts it. */
async function expectTimelineAtNow(page: Page): Promise<Locator> {
  const scroller = page.getByTestId('timeline-scroll-x').filter({ visible: true });
  await expect(scroller).toBeVisible();
  const { width, max } = await scroller.evaluate((el) => ({ width: el.clientWidth, max: el.scrollWidth - el.clientWidth }));
  const now = PINNED_NOW.getTime();
  const { x } = eventScrollTarget({ fromMs: now, toMs: now, dayStartMs: WED, viewportWidth: width, lane: undefined, areaHeight: 0, bottomClearance: 0 });
  const target = Math.min(Math.max(0, x), max);
  await expect.poll(async () => Math.abs((await scroller.evaluate((el) => el.scrollLeft)) - target), { timeout: 5_000 })
    .toBeLessThanOrEqual(2);
  return scroller;
}

test('on My plan the now pill goes to its timeline at now, and back', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await letPlanLand(appPage);

  // On My plan, now in view: the Program, scrolled to now.
  await pill.click();
  const timeline = await expectTimelineAtNow(appPage);

  // On the timeline: back to My plan.
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await expect(timeline).toHaveCount(0);
});

test('in a break, the now pill on My plan goes to the timeline at now, not to the next band', async ({ appPage }) => {
  await ready(appPage);
  // At 14:00 MINISTRY (22:20) is hours away: the pill counts down to it.
  await mustSee(appPage, 'ministry');
  await appPage.getByTestId('artist-search').fill('');
  const pill = appPage.getByTestId('now-pill');
  await expect(pill).toHaveAccessibleName(/MINISTRY START/);
  await pill.click();
  await expect(appPage.getByText('MINISTRY', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await letPlanLand(appPage);

  // On My plan, now in view: the Program at now, eight hours short of the band.
  await pill.click();
  const timeline = await expectTimelineAtNow(appPage);
  await expect(timeline.getByText('MINISTRY', { exact: true }).first()).not.toBeInViewport();
});

test('on My plan scrolled away from now, the now pill scrolls to now, then goes to the timeline', async ({ appPage }) => {
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
  await list.evaluate((el, y) => { el.scrollTop = y; }, end);
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(end);
  await expect(appPage.getByTestId('plan-clash-bar').first()).not.toBeInViewport();

  // Now is out of view: the pill scrolls My plan back to it.
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeInViewport();
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
  // Wait for the scroll to settle before the next tap.
  let last = -1;
  await expect.poll(async () => {
    const y = await list.evaluate((el) => el.scrollTop);
    const still = y === last;
    last = y;
    return still;
  }, { intervals: [200] }).toBe(true);

  // Now is in view: the next tap goes to the timeline at now.
  await pill.click();
  await expectTimelineAtNow(appPage);
});

test('on My plan showing another day, the now pill goes to today at now, not the timeline', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await appPage.getByText('Thu', { exact: true }).filter({ visible: true }).click();
  await expect(appPage.getByText('Nothing planned for this day')).toBeVisible();

  // Thursday is not today: My plan again, back on Wednesday with the live set.
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible();
  await expect(appPage.getByText('Nothing planned for this day')).toHaveCount(0);
  await expect(appPage.getByTestId('timeline-scroll-x').filter({ visible: true })).toHaveCount(0);
});
