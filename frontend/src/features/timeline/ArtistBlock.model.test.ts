import { artistBlockModel, blockSpan, type ArtistBlockInputs } from './ArtistBlock.model';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── A set's block, as a model ─────────────────────────────────────────────────
//
// Dimensions:
//   times  — a set's start and length (170 px per hour from the day's 06:00); a
//            set of no length; the 40 px a label needs
//   row    — the first row or a stacked one
//   name   — one word or several; short or long for the block
//   pick   — none, or Maybe/Must-see (the star takes label width); and the
//            block's look: a Must-see's solid left edge, a Maybe's dotted one,
//            none on an unpicked set; a "don't go" with no fill, a dotted grey
//            1 pt frame all round (no stage colour), its text at 30 %
//   length — a block longer than the label repeat gap (repeated labels)
//   clash  — none, an overlap inside the block, one reaching past its start
//   abuts  — the next set in its row starts right at its end: cut 1 px short,
//            the lane's surface showing through as a separator
// Expected values are worked out by hand.

// The label's glyph width is empirical and differs per platform
// (ui/charWidthRatio); fixed here at 0.75, so a character is 9 px at the
// block's 12. The names either side of a limit are worked out by hand against
// the 35-minute block's label: 99.17 − 3 − 16 = 80.17 px, 69.17 with the star.
//   MASTODON     8 × 9 = 72 — fits 80.17, not 69.17 (96 without the ratio)
//   CRYSTALLAKE 11 × 9 = 99 — does not fit 80.17
// One case below takes iOS's ratio instead (see its describe).
let mockCharWidthRatio = 0.75;
jest.mock('../../ui/charWidthRatio', () => ({
  get CHAR_WIDTH_RATIO() { return mockCharWidthRatio; },
}));

const NAMES = { fitsOnlyWithoutStar: 'MASTODON', tooLong: 'CRYSTALLAKE' };

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
    abutsNext: false,
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

  it('is cut 1 px short at its end when the next set in its row starts right then, from the same start', () => {
    // 35 minutes: 99.17 px, 98.17 cut.
    const cut = model({ abutsNext: true });
    expect(cut.left).toBeCloseTo(1445);
    expect(cut.width).toBeCloseTo(98.17, 2);
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
    // Without the star the label has 80.17 px; see NAMES.
    expect(model({ name: NAMES.fitsOnlyWithoutStar }).label?.fontSize).toBe(12);
    expect(model({ name: NAMES.tooLong }).label?.fontSize).toBeCloseTo(9.6);
  });

  it('gives up the star\'s 11 px only when the star is drawn', () => {
    // 80.17 px without the star, 69.17 with it; see NAMES.
    const name = NAMES.fitsOnlyWithoutStar;
    expect(model({ name, status: 'none' }).label?.fontSize).toBe(12);
    expect(model({ name, status: 'dont_go' }).label?.fontSize).toBe(12);
    expect(model({ name, status: 'maybe' }).label?.fontSize).toBeCloseTo(9.6);
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
      artist: artist('KUNDY CREW'), dayStart: WED, status: 'none', categoryColor: 'rgb(0, 0, 0)', labelRepeat: 400, subRow: 0, overlaps: undefined, abutsNext: false,
    });
    expect(blockOf(510).label?.repeats.map((r) => [r.left, Math.round(r.width)])).toEqual([[400, 91]]);
    expect(blockOf(508).label?.repeats).toEqual([]);
  });
});

describe('its label at iOS\'s glyph width: words are never broken', () => {
  // At iOS's ratio, 0.90 when written, a character is 10.8 px at 12 and 8.64 px
  // shrunk. NOVEMBERS DOOM, Must-see (the star drawn):
  //   15:45–16:25, 40 min: 113.33 − 3 − 16 − 11 = 83.33 px for the label.
  //     NOVEMBERS 9 × 10.8 = 97.2 does not fit at 12 (the name spread over two
  //     lines would: 14 × 10.8 / 2 = 75.6); shrunk 9 × 8.64 = 77.76 fits.
  //   15:45–16:20, 35 min: 99.17 − 30 = 69.17 px; NOVEMBERS 77.76 does not fit
  //     even shrunk.
  beforeEach(() => { mockCharWidthRatio = 0.9; });
  afterEach(() => { mockCharWidthRatio = 0.75; });

  it('shrinks NOVEMBERS DOOM at 15:45–16:25 so NOVEMBERS fits a line, the name over two', () => {
    const label = model({ name: 'NOVEMBERS DOOM', from: '15:45', to: '16:25', status: 'will_go' }).label!;
    expect(label.fontSize).toBeCloseTo(9.6);
    expect(label.lines).toBe(2);
  });

  it('keeps NOVEMBERS DOOM at 15:45–16:20 to one ellipsized line, NOVEMBERS not fitting even shrunk', () => {
    const label = model({ name: 'NOVEMBERS DOOM', from: '15:45', to: '16:20', status: 'will_go' }).label!;
    expect(label.fontSize).toBeCloseTo(9.6);
    expect(label.lines).toBe(1);
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

describe('its look, by my pick', () => {
  it('fills a Must-see in its stage colour, with a solid left edge in the brighter one', () => {
    expect(model({ status: 'will_go' })).toMatchObject({ bg: 'rgb(78, 30, 30)', leftEdge: 'solid', border: 'rgb(158, 30, 30)', frame: null, textOpacity: 1 });
  });

  it('fills a Maybe in its stage colour, with a dotted left edge in the brighter one', () => {
    expect(model({ status: 'maybe' })).toMatchObject({ bg: 'rgb(78, 30, 30)', leftEdge: 'dotted', border: 'rgb(158, 30, 30)', frame: null, textOpacity: 1 });
  });

  it('fills an unpicked set in its stage colour, with no left edge', () => {
    expect(model({ status: 'none' })).toMatchObject({ bg: 'rgb(78, 30, 30)', leftEdge: null, frame: null, textOpacity: 1 });
  });

  it('draws a "don\'t go" with no fill and no stage colour: a dotted grey 1 pt frame all round, and its text at 30 %', () => {
    expect(model({ status: 'dont_go' })).toMatchObject({ bg: 'transparent', leftEdge: null, frame: '#4d4d4d', textOpacity: 0.3 });
  });
});
