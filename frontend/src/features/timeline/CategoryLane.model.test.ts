import { categoryLaneModel, laneTitleModel, type LaneSetInput } from './CategoryLane.model';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

// ── A lane and its title, as models ───────────────────────────────────────────
//
// Dimensions:
//   sets   — one; two overlapping; back to back (no overlap); three where two
//            overlap the first but not each other
//   stack  — on (Support Program, conflict sheet) or off (Program)
//   layout — a title strip (portrait) or the title over the lane (short viewport)

const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);
const CATEGORY: DbCategory = { slug: 't', categoryId: '7', color: 0xff00ff00, localized: [{ language: 'en', title: 'Exhibition' }] } as unknown as DbCategory;

function set(id: string, from: string, to: string): LaneSetInput {
  const event: DbEvent = { slug: 't', eventId: id, artistId: id, stageId: 's', categoryId: '7', dateFrom: at(from), dateTo: at(to) };
  const artist: DbArtist = { slug: 't', artistId: id, name: id, isPlayable: false, imageUrl: '', thumbUrl: '', url: '', localized: [] };
  return { event, artist, status: 'none', overlaps: undefined, muted: false };
}

const rows = (sets: LaneSetInput[], stack = true) =>
  categoryLaneModel(CATEGORY, sets, { stack, overlayTitles: false }).sets.map((s) => [s.event.eventId, s.subRow]);

describe('categoryLaneModel', () => {
  it('is one row, 70 tall, for one set', () => {
    const lane = categoryLaneModel(CATEGORY, [set('a', '10:00', '11:00')], { stack: true, overlayTitles: false });
    expect([lane.key, lane.stripHeight, lane.height]).toEqual(['7', 32, 70]);
  });

  it('stacks two overlapping sets in two rows, 140 tall', () => {
    expect(categoryLaneModel(CATEGORY, [set('a', '10:00', '17:00'), set('b', '10:00', '17:00')], { stack: true, overlayTitles: false }).height).toBe(140);
    expect(rows([set('a', '10:00', '17:00'), set('b', '10:00', '17:00')])).toEqual([['a', 0], ['b', 1]]);
  });

  it('keeps sets back to back in one row', () => {
    expect(rows([set('a', '10:00', '11:00'), set('b', '11:00', '12:00')])).toEqual([['a', 0], ['b', 0]]);
  });

  it('puts a set in the first row free by its start', () => {
    // b and c both overlap a, not each other: c reuses b's row.
    expect(rows([set('a', '10:00', '17:00'), set('b', '11:00', '12:00'), set('c', '13:00', '14:00')]))
      .toEqual([['a', 0], ['b', 1], ['c', 1]]);
  });

  it('draws every set in the first row without stacking, the lane one row tall', () => {
    expect(rows([set('a', '10:00', '17:00'), set('b', '10:00', '17:00')], false)).toEqual([['a', 0], ['b', 0]]);
    expect(categoryLaneModel(CATEGORY, [set('a', '10:00', '17:00'), set('b', '10:00', '17:00')], { stack: false, overlayTitles: false }).height).toBe(70);
  });

  it('has no strip on a short viewport', () => {
    expect(categoryLaneModel(CATEGORY, [set('a', '10:00', '11:00')], { stack: true, overlayTitles: true }).stripHeight).toBe(0);
  });

  it("is tinted from its category's colour", () => {
    expect(categoryLaneModel(CATEGORY, [set('a', '10:00', '11:00')], { stack: true, overlayTitles: false }).color).toBe('rgb(0, 255, 0)');
  });
});

describe('laneTitleModel', () => {
  const twoRows = categoryLaneModel(CATEGORY, [set('a', '10:00', '17:00'), set('b', '10:00', '17:00')], { stack: true, overlayTitles: true });

  it('fills the strip, centred, in a strip layout', () => {
    expect(laneTitleModel(CATEGORY, twoRows, 102, false)).toEqual({
      key: 'title-7', text: 'Exhibition', top: 102, height: 32, fontSize: 14, paddingTop: 0, overLane: false,
    });
  });

  it('spans the whole lane, at its top, over a short viewport\'s lane', () => {
    expect(laneTitleModel(CATEGORY, twoRows, 70, true)).toEqual({
      key: 'title-7', text: 'Exhibition', top: 70, height: 140, fontSize: 16, paddingTop: 4, overLane: true,
    });
  });
});
