import { timelineDayModel, type TimelineDayInputs } from './TimelineDay.model';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { ConflictOverlap } from '../../utils/conflictUtils';

// ── One festival day of a timeline, configured ────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
//   lens     — Everything; My picks (any level, Maybe and up, Must-see only);
//              a friend's picks (theirs, not mine)
//   filter   — the screen's own: bands (Program) or the rest (Support Program)
//   hidden   — a hidden lane: gone, the lanes below move up; its sets still
//              set where the day lands
//   data     — picks: Must-see, Maybe, none, don't go; a set after midnight
//              (the day before's); a set at 06:00 (its own day); an empty
//              category; category ids ordered as numbers (9 before 10)
//   stacking — overlapping sets stacked (Support Program) or not (Program)
//   layout   — title strips, or titles over the lanes (short viewport)
//   blocks   — the star and conflict bars follow my picks under every lens
// Expected values are written by hand: a lane is 32 (strip) + 70 per row.

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const at = (iso: string): number => Date.parse(iso);

function category(categoryId: string): DbCategory {
  return { slug: 't', categoryId, color: 0, localized: [{ language: 'en', title: `Lane ${categoryId}` }] } as unknown as DbCategory;
}
function artist(artistId: string, isPlayable = true): DbArtist {
  return { slug: 't', artistId, name: artistId.toUpperCase(), isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function event(artistId: string, categoryId: string, from: string, to: string): DbEvent {
  return { slug: 't', eventId: `e-${artistId}`, artistId, stageId: 's', categoryId, dateFrom: at(from), dateTo: at(to) };
}

// Bands in lanes 1 and 9; support sets in lane 10, two of them overlapping.
const ARTISTS = [artist('must'), artist('maybe'), artist('none'), artist('dont'), artist('night'), artist('nextday'),
  artist('ex1', false), artist('ex2', false)];
const EVENTS = [
  event('must', '1', '2025-08-06T14:00:00+02:00', '2025-08-06T15:00:00+02:00'),
  event('maybe', '9', '2025-08-06T12:00:00+02:00', '2025-08-06T13:00:00+02:00'),
  event('none', '9', '2025-08-06T16:00:00+02:00', '2025-08-06T17:00:00+02:00'),
  event('dont', '1', '2025-08-06T18:00:00+02:00', '2025-08-06T19:00:00+02:00'),
  // Thursday 00:30: still Wednesday's festival day.
  event('night', '1', '2025-08-07T00:30:00+02:00', '2025-08-07T01:15:00+02:00'),
  // Thursday 06:00: Thursday's.
  event('nextday', '1', '2025-08-07T06:00:00+02:00', '2025-08-07T07:00:00+02:00'),
  event('ex1', '10', '2025-08-06T10:00:00+02:00', '2025-08-06T17:00:00+02:00'),
  event('ex2', '10', '2025-08-06T10:00:00+02:00', '2025-08-06T17:00:00+02:00'),
];
// Category 3 has nothing on the day; 10 is listed before 9 to test the order.
const CATEGORIES = [category('10'), category('3'), category('9'), category('1')];
const MINE: Record<string, string> = { must: 'will_go', maybe: 'maybe', none: 'none', dont: 'dont_go', ex1: 'maybe' };

const playable = (a: DbArtist): boolean => a.isPlayable;
const support = (a: DbArtist): boolean => !a.isPlayable;

function day(overrides: Partial<TimelineDayInputs> = {}) {
  return timelineDayModel({
    events: EVENTS,
    artists: ARTISTS,
    categories: CATEGORIES,
    dayStart: WED,
    filterArtist: playable,
    scope: { kind: 'all' },
    interests: MINE,
    friendInterests: undefined,
    hiddenCategories: new Set(),
    conflictOverlaps: new Map(),
    stack: false,
    overlayTitles: false,
    ...overrides,
  });
}

/** Each lane as `categoryId: artists in it`. */
const listed = (d: ReturnType<typeof day>): string[] => d.lanes.map((l) => `${l.key}: ${l.sets.map((s) => s.artist.artistId).join(' ')}`);

describe('which sets are listed', () => {
  it('lists every band of the day with Everything, in category order, the night set included', () => {
    expect(listed(day())).toEqual(['1: must dont night', '9: maybe none']);
  });

  it('lists my Maybes and Must-sees with "My picks"', () => {
    expect(listed(day({ scope: { kind: 'me', level: null } }))).toEqual(['1: must', '9: maybe']);
  });

  it('lists only my Must-sees at the Must-see level', () => {
    expect(listed(day({ scope: { kind: 'me', level: 'will_go' } }))).toEqual(['1: must']);
  });

  it("lists the friend's picks, not mine, with a friend's lens", () => {
    expect(listed(day({ scope: { kind: 'friend', token: 'f', level: null }, friendInterests: { none: 'will_go' } }))).toEqual(['9: none']);
  });

  it("lists the support programme's sets only on the Support Program", () => {
    expect(listed(day({ filterArtist: support }))).toEqual(['10: ex1 ex2']);
  });

  it('lists nothing while there are no days', () => {
    expect(day({ dayStart: 0 })).toEqual({ lanes: [], titles: [], tops: {}, canvasHeight: 32, firstEventMs: undefined });
  });
});

describe('where the lanes are', () => {
  it('stacks the lanes from the top: 32 + 70 each, the ruler 32 more', () => {
    const d = day();
    expect(d.tops).toEqual({ '1': 0, '9': 102 });
    expect(d.titles.map((t) => [t.key, t.top])).toEqual([['title-1', 0], ['title-9', 102]]);
    expect(d.canvasHeight).toBe(32 + 102 + 102);
  });

  it('drops a hidden lane and moves the ones below up', () => {
    const d = day({ hiddenCategories: new Set(['1']) });
    expect(listed(d)).toEqual(['9: maybe none']);
    expect(d.tops).toEqual({ '9': 0 });
    expect(d.canvasHeight).toBe(32 + 102);
  });

  it('stacks overlapping sets in rows on the Support Program, the lane 32 + 140', () => {
    const d = day({ filterArtist: support, stack: true });
    expect(d.lanes[0].sets.map((s) => s.subRow)).toEqual([0, 1]);
    expect(d.canvasHeight).toBe(32 + 172);
  });

  it('stacks only the shown sets: one picked of two overlapping takes one row', () => {
    const d = day({ filterArtist: support, stack: true, scope: { kind: 'me', level: null } });
    expect(listed(d)).toEqual(['10: ex1']);
    expect(d.lanes[0].height).toBe(70);
  });

  it('leaves no strips on a short viewport: the titles go over the lanes', () => {
    const d = day({ overlayTitles: true });
    expect(d.tops).toEqual({ '1': 0, '9': 70 });
    expect(d.titles.map((t) => [t.top, t.height, t.overLane])).toEqual([[0, 70, true], [70, 70, true]]);
  });
});

describe('where the day lands', () => {
  it('lands at the earliest set listed', () => {
    expect(day().firstEventMs).toBe(at('2025-08-06T12:00:00+02:00'));
  });

  it('follows the lens', () => {
    expect(day({ scope: { kind: 'me', level: 'will_go' } }).firstEventMs).toBe(at('2025-08-06T14:00:00+02:00'));
  });

  it('counts a hidden lane\'s sets too', () => {
    expect(day({ hiddenCategories: new Set(['9']) }).firstEventMs).toBe(at('2025-08-06T12:00:00+02:00'));
  });
});

describe('what each block is given', () => {
  const overlap: ConflictOverlap[] = [{ from: at('2025-08-06T14:30:00+02:00'), to: at('2025-08-06T14:45:00+02:00') }];

  it('carries my pick and my overlaps, under a friend\'s lens too', () => {
    const d = day({
      scope: { kind: 'friend', token: 'f', level: null },
      friendInterests: { must: 'maybe' },
      conflictOverlaps: new Map([['e-must', overlap]]),
    });
    expect(d.lanes[0].sets[0]).toMatchObject({ status: 'will_go', overlaps: overlap });
  });

  it('carries none for a set without a pick or a clash', () => {
    expect(day().lanes[1].sets[1]).toMatchObject({ status: 'none', overlaps: undefined });
  });
});
