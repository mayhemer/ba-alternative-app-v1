import { growMountWindow, isMountComplete, laneInMountWindow, mountBlocks, spanInMountWindow, type MountBlock, type MountWindow } from './mountWindow';
import { categoryLaneModel, type LaneSetInput } from './CategoryLane.model';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

// ── The progressive mount's window, as a model ────────────────────────────────
//
// Dimensions:
//   edges  — a block or lane touching the window's edge, and one a pixel clear
//   blocks — none; all inside; one a step away; one several steps away (the
//            steps between bring nothing in); one in a lane further down
//   view   — a set the scrollable view clips entirely, one it clips in part;
//            growth that would pass the view's edges
//
// Geometry: 170 px per hour from 06:00, so 10:00 is at 680. The scrollable view
// is 08:30 (425) to 04:00 (3740).

const DAY = Date.parse('2025-08-06T06:00:00+02:00');
const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);
const CATEGORY: DbCategory = { slug: 't', categoryId: '7', color: 0xff00ff00, localized: [{ language: 'en', title: 'Exhibition' }] } as unknown as DbCategory;

function set(id: string, from: string, to: string): LaneSetInput {
  const event: DbEvent = { slug: 't', eventId: id, artistId: id, stageId: 's', categoryId: '7', dateFrom: at(from), dateTo: at(to) };
  const artist: DbArtist = { slug: 't', artistId: id, name: id, isPlayable: false, imageUrl: '', thumbUrl: '', url: '', localized: [] };
  return { event, artist, status: 'none', overlaps: undefined, muted: false };
}

const lane = (key: string, sets: LaneSetInput[]) =>
  ({ ...categoryLaneModel(CATEGORY, sets, { stack: true, overlayTitles: false }), key });

const block = (left: number, right: number, top = 0, bottom = 102): MountBlock => ({ left, right, top, bottom });

const WINDOW: MountWindow = { day: DAY, fromX: 1000, toX: 1400, fromY: 0, toY: 600 };

describe('spanInMountWindow', () => {
  it('counts a block that ends at the left edge, or starts at the right edge, as inside', () => {
    expect(spanInMountWindow({ left: 100, width: 100 }, 200, 400)).toBe(true);
    expect(spanInMountWindow({ left: 400, width: 100 }, 200, 400)).toBe(true);
  });

  it('leaves out a block a pixel clear of either edge', () => {
    expect(spanInMountWindow({ left: 100, width: 99 }, 200, 400)).toBe(false);
    expect(spanInMountWindow({ left: 401, width: 100 }, 200, 400)).toBe(false);
  });
});

describe('laneInMountWindow', () => {
  it('counts a lane that ends at the top edge, or starts at the bottom edge, as inside', () => {
    expect(laneInMountWindow(100, 202, { ...WINDOW, fromY: 202, toY: 800 })).toBe(true);
    expect(laneInMountWindow(100, 202, { ...WINDOW, fromY: -500, toY: 100 })).toBe(true);
  });

  it('leaves out a lane a pixel clear of either edge', () => {
    expect(laneInMountWindow(100, 202, { ...WINDOW, fromY: 203, toY: 800 })).toBe(false);
    expect(laneInMountWindow(100, 202, { ...WINDOW, fromY: -500, toY: 99 })).toBe(false);
  });
});

describe('mountBlocks', () => {
  it('is one block per set, its span with its lane\'s top and bottom', () => {
    // The second lane stacks two rows: 32 + 140 tall, from 102.
    const lanes = [
      lane('a', [set('1', '10:00', '11:00')]),
      lane('b', [set('2', '12:00', '13:00'), set('3', '12:00', '13:00')]),
    ];
    expect(mountBlocks(lanes, { a: 0, b: 102 }, DAY)).toEqual([
      block(680, 850, 0, 102),
      block(1020, 1190, 102, 274),
      block(1020, 1190, 102, 274),
    ]);
  });

  it('leaves out a set the view clips entirely, and keeps one it clips in part', () => {
    // 06:00–08:00 ends before 08:30; 08:00–09:00 reaches past it.
    const lanes = [lane('a', [set('1', '06:00', '08:00'), set('2', '08:00', '09:00')])];
    expect(mountBlocks(lanes, { a: 0 }, DAY)).toEqual([block(340, 510)]);
  });

  it('is empty on a day with no lanes', () => {
    expect(mountBlocks([], {}, DAY)).toEqual([]);
  });
});

describe('isMountComplete', () => {
  it('is complete with no blocks', () => {
    expect(isMountComplete(WINDOW, [])).toBe(true);
  });

  it('is complete once every block is inside, edges included', () => {
    expect(isMountComplete(WINDOW, [block(1100, 1200), block(1400, 1500, 600, 702)])).toBe(true);
  });

  it('is not complete while a block is clear of the window', () => {
    expect(isMountComplete(WINDOW, [block(1100, 1200), block(1401, 1500)])).toBe(false);
    expect(isMountComplete(WINDOW, [block(1100, 1200), block(1100, 1200, 601, 703)])).toBe(false);
  });
});

describe('growMountWindow', () => {
  it('grows one step in every direction when that brings a new block in', () => {
    const blocks = [block(1100, 1200), block(1700, 1800)];
    expect(growMountWindow(WINDOW, blocks, 400, 600)).toEqual({ day: DAY, fromX: 600, toX: 1800, fromY: -600, toY: 1200 });
  });

  it('takes as many steps as it needs to bring a new block in, never a step that brings none', () => {
    // 1800 and 2200 bring nothing in; 2600 reaches the block at 2500.
    const blocks = [block(1100, 1200), block(2500, 2600)];
    expect(growMountWindow(WINDOW, blocks, 400, 600)).toEqual({ day: DAY, fromX: 425, toX: 2600, fromY: -1800, toY: 2400 });
  });

  it('brings in a block in a lane further down', () => {
    // 1200 is above the lane at 1300; 1800 reaches it.
    const blocks = [block(1100, 1200), block(1100, 1200, 1300, 1402)];
    expect(growMountWindow(WINDOW, blocks, 400, 600)).toEqual({ day: DAY, fromX: 425, toX: 2200, fromY: -1200, toY: 1800 });
  });

  it('never grows past the view\'s edges', () => {
    const start: MountWindow = { day: DAY, fromX: 500, toX: 3700, fromY: 0, toY: 600 };
    expect(growMountWindow(start, [block(1100, 1200), block(1100, 1200, 700, 802)], 400, 600))
      .toEqual({ day: DAY, fromX: 425, toX: 3740, fromY: -600, toY: 1200 });
  });

  it('leaves a complete window as it is', () => {
    expect(growMountWindow(WINDOW, [block(1100, 1200)], 400, 600)).toBe(WINDOW);
  });
});
