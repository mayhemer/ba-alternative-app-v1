import { artistBlockModel, blockSpan, type ArtistBlockInputs } from './ArtistBlock.model';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set's block, as a model ─────────────────────────────────────────────────
//
// Dimensions:
//   times  — a set's start and length (170 px per hour from the day's 06:00); a
//            set of no length; the 40 px a label needs
//   row    — the first row or a stacked one
//   name   — one word or several; short or long for the block
//   pick   — none, or Maybe/Must-see (the star takes label width)
//   length — a block longer than the label repeat gap (repeated labels)
//   clash  — none, an overlap inside the block, one reaching past its start
// Expected values are worked out by hand.

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const at = (hm: string): number => Date.parse(`2025-08-06T${hm}:00+02:00`);
const MIN = 60 * 1000;

function event(from: string, to: string): DbEvent {
  return { slug: 't', eventId: 'e1', artistId: 'a1', stageId: 's', categoryId: 'c', dateFrom: at(from), dateTo: at(to) };
}
function artist(name: string): DbArtist {
  return { slug: 't', artistId: 'a1', name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}

function model(overrides: Partial<ArtistBlockInputs> & { from?: string; to?: string; name?: string } = {}) {
  const { from = '14:30', to = '15:05', name = 'GOJIRA', ...rest } = overrides;
  return artistBlockModel({
    event: event(from, to),
    artist: artist(name),
    dayStart: WED,
    status: 'none',
    categoryColor: 'rgb(255, 0, 0)',
    labelRepeat: 400,
    subRow: 0,
    overlaps: undefined,
    ...rest,
  });
}

describe('where a block is drawn', () => {
  it('starts at its time and is as long as the set', () => {
    // 14:30 is 8 h 30 after 06:00; 35 minutes long.
    const block = model();
    expect(block.left).toBeCloseTo(1445);
    expect(block.width).toBeCloseTo(99.17, 2);
  });

  it('is never narrower than 4 px, for a set of no length', () => {
    expect(model({ from: '13:00', to: '13:00' }).width).toBe(4);
  });

  it('fills its row: 68 tall, the lane border below it, one row down 70', () => {
    expect([model().top, model().height]).toEqual([0, 68]);
    expect(model({ subRow: 1 }).top).toBe(70);
  });

  it("gives the lane's mount filter the same span", () => {
    expect(blockSpan(event('14:30', '15:05'), WED)).toEqual({ left: model().left, width: model().width });
  });

  it("is tinted from its category's colour", () => {
    expect([model().bg, model().border]).toEqual(['rgb(78, 30, 30)', 'rgb(158, 30, 30)']);
  });
});

describe('its label', () => {
  it('is left out below 40 px: a 14-minute set (39.7 px), kept on a 15-minute one (42.5 px)', () => {
    expect(model({ from: '14:30', to: '14:44' }).label).toBeNull();
    expect(model({ from: '14:30', to: '14:45' }).label).not.toBeNull();
  });

  it('names the set and its times', () => {
    expect(model().label).toMatchObject({ name: 'GOJIRA', time: '14:30–15:05' });
  });

  it('keeps a one-word name to one line, lets others wrap to two', () => {
    expect(model({ name: 'GOJIRA' }).label?.lines).toBe(1);
    expect(model({ name: 'BLOOD INCANTATION' }).label?.lines).toBe(2);
  });

  it('shrinks to 80% when the name is estimated not to fit', () => {
    // Label width 99.17 − 3 − 16 = 80.17. GOJIRA (6 × 6.6 = 39.6) fits;
    // EXORCIZPHOBIA (13 × 6.6 = 85.8) does not.
    expect(model({ name: 'GOJIRA' }).label?.fontSize).toBe(12);
    expect(model({ name: 'EXORCIZPHOBIA' }).label?.fontSize).toBeCloseTo(9.6);
  });

  it('gives up the star\'s 11 px only when the star is drawn', () => {
    // CRYSTALLAKE: 11 × 6.6 = 72.6 — fits 80.17, not 69.17.
    expect(model({ name: 'CRYSTALLAKE', status: 'none' }).label?.fontSize).toBe(12);
    expect(model({ name: 'CRYSTALLAKE', status: 'dont_go' }).label?.fontSize).toBe(12);
    expect(model({ name: 'CRYSTALLAKE', status: 'maybe' }).label?.fontSize).toBeCloseTo(9.6);
  });

  it('does not repeat on a block shorter than the repeat gap', () => {
    expect(model().label).toMatchObject({ segmentWidth: null, repeats: [] });
  });

  it('repeats along a long block every gap, while 90 px are left for a copy', () => {
    // 13:00–23:59: 1867.2 px; label width 1848.2. Copies at 400, 800, 1200 and
    // 1600, none at 2000 (2000 + 90 > 1848). Each held to the 388 px segment,
    // the last to the 248 px left.
    const label = model({ from: '13:00', to: '23:59', name: 'KUNDY CREW' }).label!;
    expect(label.segmentWidth).toBe(388);
    expect(label.repeats.map((r) => r.left)).toEqual([400, 800, 1200, 1600]);
    expect(label.repeats.map((r) => Math.round(r.width))).toEqual([388, 388, 388, 248]);
  });

  it('adds a copy only while 90 px are left for it', () => {
    // A copy at 400 needs a label 490 wide: a 509 px block (19 px of border,
    // padding). One a pixel wider keeps it, 91 wide; one a pixel narrower not.
    const blockOf = (px: number) => artistBlockModel({
      event: { ...event('10:00', '10:00'), dateTo: at('10:00') + (px / 170) * 60 * MIN },
      artist: artist('KUNDY CREW'), dayStart: WED, status: 'none', categoryColor: 'rgb(0, 0, 0)', labelRepeat: 400, subRow: 0, overlaps: undefined,
    });
    expect(blockOf(510).label?.repeats.map((r) => [r.left, Math.round(r.width)])).toEqual([[400, 91]]);
    expect(blockOf(508).label?.repeats).toEqual([]);
  });
});

describe('its conflict bars', () => {
  it('has none without a clash', () => {
    expect(model().bars).toEqual([]);
  });

  it('covers just the overlapping part: 14:30–14:40 over 14:00–14:40', () => {
    const [bar] = model({ from: '14:00', to: '14:40', overlaps: [{ from: at('14:30'), to: at('14:40') }] }).bars;
    expect(bar.left).toBeCloseTo(85);
    expect(bar.width).toBeCloseTo(28.33, 2);
  });

  it('starts at the block for an overlap from before its start', () => {
    const [bar] = model({ overlaps: [{ from: at('14:00'), to: at('14:40') }] }).bars;
    expect(bar.left).toBe(0);
    // 14:30–14:40 of the block.
    expect(bar.width).toBeCloseTo(28.33, 2);
  });

  it('is at least 4 px wide, for a one-minute overlap', () => {
    expect(model({ overlaps: [{ from: at('14:30'), to: at('14:31') }] }).bars[0].width).toBe(4);
  });

  it('draws one bar per overlap interval', () => {
    expect(model({ overlaps: [{ from: at('14:30'), to: at('14:35') }, { from: at('14:55'), to: at('15:05') }] }).bars).toHaveLength(2);
  });
});
