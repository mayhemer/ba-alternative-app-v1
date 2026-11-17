import { laneOrderPanelModel } from './LaneOrderPanel.model';
import type { DbCategory } from '../../../types/backend';

// ── The order panel's heading and rows ────────────────────────────────────────
//
// Dimensions: the screen (Program: stages; Support Program: categories); the
// order the rows are handed in, which they keep.

function category(categoryId: string, title: string): DbCategory {
  return { slug: 't', categoryId, color: 0, localized: [{ language: 'EN', title }] } as unknown as DbCategory;
}

const LANES = [category('2', 'Sea Shepherd'), category('1', 'Marshall')];

it('calls the Program\'s list the stage order', () => {
  expect(laneOrderPanelModel({ support: false, categories: LANES })).toMatchObject({ title: 'Stage order', subtitle: 'Every day' });
});

it('calls the Support Program\'s list the category order', () => {
  expect(laneOrderPanelModel({ support: true, categories: LANES })).toMatchObject({ title: 'Category order', subtitle: 'Every day' });
});

it('lists a row per lane in the order given', () => {
  expect(laneOrderPanelModel({ support: false, categories: LANES }).rows.map((r) => r.name)).toEqual(['Sea Shepherd', 'Marshall']);
});
