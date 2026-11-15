import type { Locator, Page } from '@playwright/test';

// ── Search, as a user drives it ───────────────────────────────────────────────
//
// The search opens from the screen's chip (the lens chip, or My plan's filter
// chip) through the field at the top of its panel (docs/frontend/design/search.md).

/** Opens the search from the chip and types `query`. */
export async function searchFor(page: Page, query: string, chip = 'View and share schedules'): Promise<void> {
  await page.getByLabel(chip, { exact: true }).filter({ visible: true }).first().click();
  await page.getByTestId('search-entry').click();
  await page.getByTestId('search-input').fill(query);
}

/** The best-ranked result row whose name contains `name`. */
export function searchResult(page: Page, name: string): Locator {
  return page.locator('[data-testid^="search-row-"]').filter({ hasText: name }).first();
}

/** Closes the search with its ✕; in a typed field the first ✕ only clears it. */
export async function closeSearch(page: Page): Promise<void> {
  const clear = page.getByLabel('Clear search', { exact: true }).filter({ visible: true });
  if (await clear.count() > 0) {
    await clear.last().click();
  }
  await page.getByLabel('Close search', { exact: true }).filter({ visible: true }).last().click();
}
