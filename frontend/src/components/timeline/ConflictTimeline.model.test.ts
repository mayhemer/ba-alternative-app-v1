import { conflictTimelineModel, type ConflictTimelineInputs } from './ConflictTimeline.model';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

// ── The conflict sheet's timeline, as a model ─────────────────────────────────
//
// Dimensions:
//   group  — sets in two categories; two overlapping sets in one category
//   width  — the sheet's measured width: the range is widened to it, evenly,
//            and the labels repeat by it
//   picks  — each set carries my pick and its overlaps, for its block
// Expected values by hand: 170 px per hour from the day's 06:00; a lane is
// 32 (strip) + 70 per row.

const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);

function category(categoryId: string): DbCategory {
  return { slug: 't', categoryId, color: 0, localized: [{ language: 'en', title: `Lane ${categoryId}` }] } as unknown as DbCategory;
}
function set(id: string, categoryId: string, from: string, to: string): DbEvent {
  return { slug: 't', eventId: `e-${id}`, artistId: id, stageId: 's', categoryId, dateFrom: at(from), dateTo: at(to) };
}
const ARTISTS: DbArtist[] = ['crystal', 'exor', 'lino', 'local'].map((id) =>
  ({ slug: 't', artistId: id, name: id, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] }));

// 14:00–14:40 and 14:30–15:05, in lanes 2 and 3.
const CLASH = [set('crystal', '2', '14:00', '14:40'), set('exor', '3', '14:30', '15:05')];

function model(overrides: Partial<ConflictTimelineInputs> = {}) {
  return conflictTimelineModel({
    group: CLASH,
    artists: ARTISTS,
    categories: [category('3'), category('2'), category('11')],
    interests: { crystal: 'will_go', exor: 'will_go' },
    conflictOverlaps: new Map([['e-exor', [{ from: at('14:30'), to: at('14:40') }]]]),
    viewWidth: 700,
    ...overrides,
  });
}

describe('conflictTimelineModel', () => {
  it('cuts the day to the clash, half an hour either side, widened evenly to the sheet', () => {
    // 13:30–15:35 is 354 px, widened to 700 around 14:32:30 (8 h 32 min 30 s
    // after 06:00, 1452.08 px): from 1102.08.
    const m = model();
    expect(m.dayStart).toBe(at('06:00'));
    expect(m.width).toBeCloseTo(700);
    expect(m.fromX).toBeCloseTo(1102.08, 1);
  });

  it('keeps the clash with its margins when that is wider than the sheet', () => {
    // 13:30–15:35 is 354.2 px, wider than a 300 px sheet.
    const m = model({ viewWidth: 300 });
    expect(m.width).toBeCloseTo(354.17, 1);
    expect(m.fromX).toBeCloseTo(7.5 * 170);
  });

  it('gives each category with a set a lane, in category order, titled in turn', () => {
    const m = model();
    expect(m.lanes.map((l) => [l.key, l.height])).toEqual([['2', 70], ['3', 70]]);
    expect(m.titles.map((t) => [t.text, t.top])).toEqual([['Lane 2', 0], ['Lane 3', 102]]);
    expect(m.stackHeight).toBe(204);
  });

  it('stacks overlapping sets of one category in rows', () => {
    const m = model({ group: [set('lino', '11', '10:00', '17:00'), set('local', '11', '10:00', '17:00')] });
    expect(m.lanes.map((l) => [l.key, l.height])).toEqual([['11', 140]]);
    expect(m.lanes[0].sets.map((s) => s.subRow)).toEqual([0, 1]);
  });

  it("hands each block my pick and its overlaps", () => {
    const [crystal] = model().lanes[0].sets;
    const [exor] = model().lanes[1].sets;
    expect([crystal.status, crystal.overlaps]).toEqual(['will_go', undefined]);
    expect(exor.overlaps).toEqual([{ from: at('14:30'), to: at('14:40') }]);
  });

  it('repeats labels by the measured width', () => {
    expect(model({ viewWidth: 700 }).labelRepeat).toBe(765);
    expect(model({ viewWidth: 390 }).labelRepeat).toBe(425);
  });
});
