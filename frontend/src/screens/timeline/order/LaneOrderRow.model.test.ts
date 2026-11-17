import { laneOrderRowModel } from './LaneOrderRow.model';
import type { DbCategory } from '../../../types/backend';

// ── A row of the order list ───────────────────────────────────────────────────
//
// Its name, its swatch in the colours the lane's blocks are filled and edged
// with, and what a screen reader says for its handle.

// Marshall's colour, rgb(222, 25, 81); its blocks are filled rgb(72, 35, 45) and
// edged rgb(141, 43, 71) (utils/color: x / 255 * 48 + 30, x / 255 * 128 + 30).
const MARSHALL = {
  slug: 'ba2025',
  categoryId: '1',
  color: -2221743,
  localized: [{ language: 'EN', title: 'Marshall' }, { language: 'CS', title: 'Marshall' }],
} as unknown as DbCategory;

it('names the lane and colours its swatch as the lane\'s blocks', () => {
  expect(laneOrderRowModel(MARSHALL)).toEqual({
    key: '1',
    name: 'Marshall',
    swatchFill: 'rgb(72, 35, 45)',
    swatchEdge: 'rgb(141, 43, 71)',
    moveLabel: 'Move Marshall',
  });
});
