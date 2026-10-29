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

  await appPage.getByLabel('Filters').click();
  await appPage.getByRole('switch', { name: 'Show only conflicts' }).click();
  await appPage.getByLabel('Close').click();

  await expect(appPage.getByText('CRYSTAL LAKE', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByText('EXORCIZPHOBIA', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  // No gaps in this mode.
  await expect(appPage.getByTestId('plan-gap')).toHaveCount(0);
});

test('on My plan the now pill goes to its set on the timeline, and back', async ({ appPage }) => {
  await ready(appPage);
  await pickClashingPair(appPage);
  const pill = appPage.getByTestId('now-pill');
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });

  // On My plan: the Program, scrolled to the live set the pill names.
  await pill.click();
  const timeline = appPage.getByTestId('timeline-scroll-x').filter({ visible: true });
  await expect(timeline).toBeVisible();
  await expect(timeline.getByText('CRYSTAL LAKE', { exact: true }).first()).toBeInViewport();

  // On the timeline: back to My plan.
  await pill.click();
  await expect(appPage.getByTestId('plan-clash-bar').first()).toBeVisible({ timeout: 20_000 });
  await expect(timeline).toHaveCount(0);
});

test('in a break, the now pill on My plan goes to the next band, not to now', async ({ appPage }) => {
  await ready(appPage);
  // At 14:00 MINISTRY (22:20) is hours away: the pill counts down to it.
  await mustSee(appPage, 'ministry');
  await appPage.getByTestId('artist-search').fill('');
  const pill = appPage.getByTestId('now-pill');
  await expect(pill).toHaveAccessibleName(/MINISTRY START/);
  await pill.click();
  await expect(appPage.getByText('MINISTRY', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });

  // On My plan: the Program, scrolled eight hours on from now to the band.
  await pill.click();
  const timeline = appPage.getByTestId('timeline-scroll-x').filter({ visible: true });
  await expect(timeline).toBeVisible();
  await expect(timeline.getByText('MINISTRY', { exact: true }).first()).toBeInViewport();
});

test('the shown day tapped again switches between My plan and the timeline, on that day', async ({ appPage }) => {
  await ready(appPage);
  // Picks on Wednesday (today), none on Thursday: "Nothing planned" is Thursday.
  await pickClashingPair(appPage);
  await appPage.getByText('My plan', { exact: false }).first().click();
  const thu = appPage.getByText('Thu', { exact: true }).filter({ visible: true });
  await thu.click();
  await expect(appPage.getByText('Nothing planned for this day')).toBeVisible();

  // Thursday is not today: tapped again, the Program on Thursday, which opens
  // at its first set (MAMMOTH GRINDER, Thursday only).
  await thu.click();
  const timeline = appPage.getByTestId('timeline-scroll-x').filter({ visible: true });
  await expect(timeline.getByText('MAMMOTH GRINDER', { exact: true }).first()).toBeVisible();

  // And again: back to My plan, still on Thursday.
  await thu.click();
  await expect(appPage.getByTestId('plan-screen')).toBeVisible();
  await expect(appPage.getByText('Nothing planned for this day')).toBeVisible();
  await expect(timeline).toHaveCount(0);
});

test('My plan switches to the timeline shown last: the Support Program', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByText('Support Program', { exact: true }).filter({ visible: true }).first().click();
  await expect(appPage.getByText('Museum', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await appPage.getByText('My plan', { exact: false }).first().click();
  await expect(appPage.getByTestId('plan-screen')).toBeVisible();

  // Today with nothing planned: no now to scroll to, so the tap switches.
  await appPage.getByText('Wed', { exact: true }).filter({ visible: true }).click();
  await expect(appPage.getByText('Museum', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(appPage.getByTestId('plan-screen').filter({ visible: true })).toHaveCount(0);
});
