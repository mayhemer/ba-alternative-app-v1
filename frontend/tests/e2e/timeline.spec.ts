import type { Locator, Page } from '@playwright/test';
import { expect, PINNED_NOW, test } from './fixtures';
import { defaultScrollX, eventScrollTarget, formatTime } from '../../src/components/timeline/timelineLayout';
import type { DbArtist, DbEvent } from '../../src/types/backend';

import artistsFixture from '../fixtures/generated/ba2025/artists.json';
import scheduleFixture from '../fixtures/generated/ba2025/schedule.json';

// ── Where the timeline is scrolled to ─────────────────────────────────────────
//
// The timeline's position logic is the most intricate in the app, and on web it
// takes its own path: react-native-web ignores `contentOffset`, so the landing
// position and every restore after a reload go through a deferred scrollTo. The
// DOM exposes scrollLeft and layout boxes, which makes this the precise layer to
// assert positions on. Expected offsets come from the same timelineLayout
// functions the app uses, fed with the fixture schedule.
//
// The clock is pinned to Wednesday 6 Aug 2025, 14:00, in Europe/Prague
// (playwright.config.ts), so the Program opens on Wednesday.
//
// Tagged @layout: these also run on the phone and landscape projects, where the
// bottom bar floats over the timeline and the lane titles are overlaid.

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = PINNED_NOW.getTime();

const ARTISTS = artistsFixture as unknown as DbArtist[];
const EVENTS = scheduleFixture as unknown as DbEvent[];
const playable = new Set(ARTISTS.filter((a) => a.isPlayable).map((a) => a.artistId));

// The first set of Wednesday's main programme: where the day opens.
const FIRST_WED_SET = EVENTS
  .filter((e) => playable.has(e.artistId) && e.dateFrom >= WED && e.dateFrom < WED + DAY_MS)
  .sort((a, b) => a.dateFrom - b.dateFrom)[0];
const FIRST_WED_ARTIST = ARTISTS.find((a) => a.artistId === FIRST_WED_SET.artistId)!.name;

// A single late set, on another day, in the bottom lane: reaching it needs a day
// switch, a long horizontal jump and a vertical one.
const JUMP_ARTIST = 'REPLICANT';
const JUMP_LANE = 'Octagon';
const JUMP_TIME = '22:30–23:30';
const JUMP_DAY = 'Fri';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Opens a drawer section; on a phone the drawer is behind the menu button. */
async function openSection(page: Page, label: string): Promise<void> {
  // A closed drawer is translated off-screen, not hidden, so its items count as
  // visible. Decide the layout the way useLayoutMode does instead: below 600 on
  // the smaller side, the drawer is behind the menu button.
  const viewport = page.viewportSize()!;
  if (Math.min(viewport.width, viewport.height) < 600) {
    await page.getByLabel('Open menu').click();
  }
  await page.getByText(label, { exact: true }).filter({ visible: true }).first().click();
}

async function ready(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
}

const scrollerX = (page: Page): Locator => page.getByTestId('timeline-scroll-x').filter({ visible: true });
const scrollerY = (page: Page): Locator => page.getByTestId('timeline-scroll-y').filter({ visible: true });

const scrollLeft = (scroller: Locator): Promise<number> => scroller.evaluate((el) => el.scrollLeft);

/** Polls the scroller until it sits within a couple of pixels of `x`. */
async function expectScrolledTo(scroller: Locator, x: number): Promise<void> {
  await expect.poll(async () => Math.abs((await scrollLeft(scroller)) - x), { timeout: 5_000 })
    .toBeLessThanOrEqual(2);
}

/** Clamps a target the way the browser will: a scroller cannot pass its end. */
async function reachable(scroller: Locator, x: number): Promise<number> {
  const max = await scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
  return Math.min(Math.max(0, x), max);
}

/** Whether the element's top-left corner is inside the visible timeline area. */
async function expectInView(page: Page, target: Locator): Promise<void> {
  await expect.poll(async () => {
    const t = await target.boundingBox();
    const h = await scrollerX(page).boundingBox();
    const v = await scrollerY(page).boundingBox();
    if (t === null || h === null || v === null) {
      return 'not laid out';
    }
    const inX = t.x >= h.x && t.x < h.x + h.width;
    const inY = t.y >= v.y && t.y + t.height <= v.y + v.height;
    return inX && inY ? 'in view' : `outside: element at ${t.x},${t.y}`;
  }, { timeout: 5_000 }).toBe('in view');
}

// ── Cases ─────────────────────────────────────────────────────────────────────

test('a day opens with its first set just in from the left edge @layout', async ({ appPage }) => {
  await ready(appPage);
  await openSection(appPage, 'Program');

  const scroller = scrollerX(appPage);
  await expectScrolledTo(scroller, await reachable(scroller, defaultScrollX(FIRST_WED_SET.dateFrom, WED)));
  await expectInView(appPage, scroller.getByText(FIRST_WED_ARTIST, { exact: true }).first());
});

test('each day keeps its own scroll position, across a reload too', async ({ appPage }) => {
  await ready(appPage);
  await openSection(appPage, 'Program');
  const scroller = scrollerX(appPage);
  // Let the day land first: on web the first position is applied by a deferred
  // scrollTo, which would override a scroll made before it — faster than any
  // person could.
  await expectScrolledTo(scroller, await reachable(scroller, defaultScrollX(FIRST_WED_SET.dateFrom, WED)));

  const target = await reachable(scroller, 1500);
  await scroller.evaluate((el, x) => { el.scrollLeft = x; }, target);
  // Written through a debounced storage write: wait for it to land before
  // reloading, rather than sleeping.
  await expect.poll(() => appPage.evaluate(() => window.localStorage.getItem('timeline:scrollPositions:v2')))
    .toContain(String(target));

  await appPage.getByText('Thu', { exact: true }).filter({ visible: true }).click();
  await expect.poll(async () => Math.abs((await scrollLeft(scroller)) - target)).toBeGreaterThan(2);
  await appPage.getByText('Wed', { exact: true }).filter({ visible: true }).click();
  await expectScrolledTo(scroller, target);

  // A cold start: the app opens on the artist list, and the timeline has to
  // restore the day and its offset through the web-only deferred scrollTo.
  await appPage.reload();
  await expect(appPage.getByText('LOADING ARTISTS…')).toHaveCount(0, { timeout: 20_000 });
  await openSection(appPage, 'Program');
  await expectScrolledTo(scrollerX(appPage), target);
});

test('going to a set from the artist sheet brings it into view @layout', async ({ appPage }) => {
  await ready(appPage);
  await appPage.getByPlaceholder('Search artists…').fill(JUMP_ARTIST.toLowerCase());
  await appPage.getByText(JUMP_ARTIST, { exact: true }).filter({ visible: true }).first().click();
  await appPage.getByText(JUMP_TIME, { exact: true }).filter({ visible: true }).first().click();

  const block = scrollerX(appPage).getByText(JUMP_ARTIST, { exact: true }).first();
  await expectInView(appPage, block);
  await expectInView(appPage, appPage.getByText(JUMP_LANE, { exact: true }).filter({ visible: true }).first());

  // On a short viewport the day switcher floats over the timeline: the set must
  // not be parked underneath it.
  const set = await block.boundingBox();
  const daySwitch = await appPage.getByText(JUMP_DAY, { exact: true }).filter({ visible: true }).boundingBox();
  expect(set!.y + set!.height).toBeLessThanOrEqual(daySwitch!.y);
});

test('the today button scrolls to now', async ({ appPage }) => {
  await ready(appPage);
  await openSection(appPage, 'Program');
  const scroller = scrollerX(appPage);
  await expectScrolledTo(scroller, await reachable(scroller, defaultScrollX(FIRST_WED_SET.dateFrom, WED)));

  // Wednesday is both today and the selected day, so pressing it again jumps
  // to the current time instead of switching day.
  await appPage.getByText('Wed', { exact: true }).filter({ visible: true }).click();

  const viewportWidth = await scroller.evaluate((el) => el.clientWidth);
  const { x } = eventScrollTarget({
    fromMs: NOW, toMs: NOW, dayStartMs: WED, viewportWidth, lane: undefined, areaHeight: 0, bottomClearance: 0,
  });
  await expectScrolledTo(scroller, await reachable(scroller, x));
});

/** Waits until the app has mirrored this many back positions into browser history. */
async function expectBackDepth(page: Page, depth: number): Promise<void> {
  await expect.poll(() => page.evaluate(() => (history.state as { baDepth?: number } | null)?.baDepth ?? 0))
    .toBe(depth);
}

test('the browser back button undoes "go to timeline" in one press', async ({ appPage }) => {
  await ready(appPage);
  // Changes within 100 ms of each other are one back position (backHistory's
  // coalescing window) — and that includes the app's own start-up. A first tap
  // faster than any person's would be folded into the starting point.
  await appPage.waitForTimeout(150);

  await appPage.getByPlaceholder('Search artists…').fill(JUMP_ARTIST.toLowerCase());
  await appPage.getByText(JUMP_ARTIST, { exact: true }).filter({ visible: true }).first().click();
  await expectBackDepth(appPage, 1);
  const eventRow = appPage.getByText(JUMP_TIME, { exact: true }).filter({ visible: true }).first();
  await eventRow.click();
  await expect(scrollerX(appPage)).toBeVisible();
  // Screen, day and sheet all moved: still one entry.
  await expectBackDepth(appPage, 2);

  await appPage.goBack();

  // Back on the list, with the artist's sheet open again.
  await expectBackDepth(appPage, 1);
  await expect(appPage.getByPlaceholder('Search artists…')).toBeVisible();
  await expect(scrollerX(appPage)).toHaveCount(0);
  await expect(eventRow).toBeVisible();
});

test.describe('on a device in another time zone', () => {
  // Planning from abroad: the timeline must still be the festival's own —
  // Wednesday from 06:00 Prague time, sets at their Prague times. Read in the
  // device's zone, the day boundary moved six hours and clipped sets out of the
  // window.
  test.use({ timezoneId: 'America/New_York' });

  test('shows the festival\'s days and times @layout', async ({ appPage }) => {
    await ready(appPage);
    await openSection(appPage, 'Program');

    const scroller = scrollerX(appPage);
    await expectScrolledTo(scroller, await reachable(scroller, defaultScrollX(FIRST_WED_SET.dateFrom, WED)));
    await expectInView(appPage, scroller.getByText(FIRST_WED_ARTIST, { exact: true }).first());
    const setTime = `${formatTime(FIRST_WED_SET.dateFrom)}–${formatTime(FIRST_WED_SET.dateTo)}`;
    await expect(scroller.getByText(setTime, { exact: true }).first()).toBeVisible();
  });
});
