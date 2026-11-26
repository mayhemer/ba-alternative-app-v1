import { planLaneOrder, planTimelineDayModel, planTimelineRule } from './PlanTimeline.model';
import type { ConflictOverlap } from '../../../lib/conflictUtils';
import type { PlanFilterLevel } from '../../../lib/plan';
import type { DbArtist, DbCategory, DbEvent } from '../../../types/backend';
import { RULER_HEIGHT } from '../../../features/timeline/timelineLayout';

// ── My plan in landscape: which sets, in which lanes ──────────────────────────
//
// The lanes are categories: the Program's first, in its lane order, then the
// Support Program's, in its. A set shows only where you picked something (a
// Must-see or a Maybe, any length; a "don't go" is no pick) that day in the
// same category on the same stage: its pair. Under Only conflicts the clashing
// Must-sees; under Must-see only and Must-see and Maybe your picks at that
// level, those over 3 h too (the list leaves them out); under All sets every
// band, as the list, and every set of a picked pair, picked or not. Dimensions:
//   the filter — Only conflicts, Must-see only, Must-see and Maybe, All sets;
//   the set    — a clashing Must-see, a Must-see on its own, a Must-see over
//                3 h, a Maybe (band and support item), a band not picked, a
//                "don't go", a support item not picked;
//   its pair   — picked; its category picked only on another stage; its stage
//                picked only in another category; holding only a "don't go";
//                picked on another day only;
//   the lanes  — the Program's, the Support Program's, a category holding
//                both, one the saved orders do not name;
//   the day    — the shown day, another day with a pick, a day without one
//                (its bands under All sets).
//
// Wednesday, by start (stage, category):
//   10:00 long-ex       sX 5  support item, Must-see, until 18:00 (over 3 h)
//   11:00 ex-other      sX 5  support item, no pick, until 21:00
//   11:00 ex-elsewhere  sY 5  support item, no pick (5 picked on sX only)
//   12:00 unpicked      sA 1  band, no pick
//   12:00 lecture       sA 4  support item, no pick (sA picked in 1 only)
//   13:00 nope          sA 1  band, "don't go"
//   13:30 nope-only     sB 2  band, "don't go" (2 picked on sE only)
//   14:00 sup-nope      sB 4  support item, "don't go", alone in its pair
//   15:00 sup-maybe     sD 5  support item, Maybe
//   16:00 sup-other     sD 5  support item, no pick
//   18:00 maybe         sD 6  band, Maybe
//   20:05 clash-a       sA 1  band, Must-see, clashes with clash-b
//   20:30 clash-b       sC 3  band, Must-see
//   21:00 c3-other      sC 3  band, no pick
//   23:00 solo          sE 2  band, Must-see
// Thursday 20:00 thursday sA 1 band, Must-see. Friday, no pick: six-sup sD 6,
// a support item (sD 6 is picked on Wednesday only, and 6 holds a band and a
// support item), and fri-band sB 2, a band. Saved orders: the Program's 3, 1; the Support Program's 5.
// Category 7 has no set.

const SLUG = 'lanetest';
const at = (iso: string): number => Date.parse(iso);
const wed = (hm: string): number => at(`2025-08-06T${hm}:00+02:00`);
const WED = wed('06:00');
const THU = at('2025-08-07T06:00:00+02:00');
const FRI = at('2025-08-08T06:00:00+02:00');

function artist(artistId: string, isPlayable: boolean): DbArtist {
  return { slug: SLUG, artistId, name: artistId, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(artistId: string, stageId: string, categoryId: string, from: number, to: number): DbEvent {
  return { slug: SLUG, eventId: `e-${artistId}`, artistId, stageId, categoryId, dateFrom: from, dateTo: to };
}
function category(categoryId: string): DbCategory {
  return { slug: SLUG, categoryId, color: 0, localized: [] } as unknown as DbCategory;
}

const BAND = true;
const SUPPORT = false;
const SETS: [string, boolean, string, string, string, string][] = [
  ['long-ex', SUPPORT, 'sX', '5', '10:00', '18:00'],
  ['ex-other', SUPPORT, 'sX', '5', '11:00', '21:00'],
  ['ex-elsewhere', SUPPORT, 'sY', '5', '11:00', '12:00'],
  ['unpicked', BAND, 'sA', '1', '12:00', '13:00'],
  ['lecture', SUPPORT, 'sA', '4', '12:00', '13:00'],
  ['nope', BAND, 'sA', '1', '13:00', '14:00'],
  ['nope-only', BAND, 'sB', '2', '13:30', '14:30'],
  ['sup-nope', SUPPORT, 'sB', '4', '14:00', '15:00'],
  ['sup-maybe', SUPPORT, 'sD', '5', '15:00', '16:00'],
  ['sup-other', SUPPORT, 'sD', '5', '16:00', '17:00'],
  ['maybe', BAND, 'sD', '6', '18:00', '19:00'],
  ['clash-a', BAND, 'sA', '1', '20:05', '21:05'],
  ['clash-b', BAND, 'sC', '3', '20:30', '21:00'],
  ['c3-other', BAND, 'sC', '3', '21:00', '22:00'],
  ['solo', BAND, 'sE', '2', '23:00', '23:45'],
];
const ARTISTS = [
  ...SETS.map(([id, isPlayable]) => artist(id, isPlayable)),
  artist('thursday', BAND),
  artist('six-sup', SUPPORT),
  artist('fri-band', BAND),
];
const EVENTS = [
  ...SETS.map(([id, , stage, cat, from, to]) => set(id, stage, cat, wed(from), wed(to))),
  set('thursday', 'sA', '1', at('2025-08-07T20:00:00+02:00'), at('2025-08-07T21:00:00+02:00')),
  set('six-sup', 'sD', '6', at('2025-08-08T18:00:00+02:00'), at('2025-08-08T19:00:00+02:00')),
  set('fri-band', 'sB', '2', at('2025-08-08T20:00:00+02:00'), at('2025-08-08T21:00:00+02:00')),
];
const byId = (id: string): DbEvent => EVENTS.find((e) => e.artistId === id)!;
const CATEGORIES = ['1', '2', '3', '4', '5', '6', '7'].map(category);
const INTERESTS = {
  'long-ex': 'will_go', nope: 'dont_go', 'nope-only': 'dont_go', 'sup-nope': 'dont_go', 'sup-maybe': 'maybe', maybe: 'maybe',
  'clash-a': 'will_go', 'clash-b': 'will_go', solo: 'will_go', thursday: 'will_go',
};
// The shared conflict calculation's result: clash-a and clash-b overlap.
const CLASH = { from: wed('20:30'), to: wed('21:00') } as ConflictOverlap;
const OVERLAPS = new Map([['e-clash-a', [CLASH]], ['e-clash-b', [CLASH]]]);

const LANE_ORDER = planLaneOrder({ events: EVENTS, artists: ARTISTS, categories: CATEGORIES, programOrder: ['3', '1'], supportOrder: ['5'] });

const day = (level: PlanFilterLevel, dayStart = WED) => planTimelineDayModel({
  interests: INTERESTS,
  events: EVENTS,
  artists: ARTISTS,
  categories: CATEGORIES,
  laneOrder: LANE_ORDER,
  overlaps: OVERLAPS,
  dayStart,
  level,
  overlayTitles: true,
});
/** Each lane as `categoryId: artists in it`. */
const lanes = (level: PlanFilterLevel, dayStart = WED): string[] =>
  day(level, dayStart).lanes.map((lane) => `${lane.key}: ${lane.sets.map((s) => s.artist.artistId).join(' ')}`);

describe('planLaneOrder', () => {
  it("puts the Program's categories first in its order, then the Support Program's in its; a category of both with the Program", () => {
    // Program: 3, 1 saved; 2 and 6 not named, by id. Support: 5 saved; 4 not named.
    expect(LANE_ORDER).toEqual(['3', '1', '2', '6', '5', '4']);
  });

  it('orders each side by id while nothing is saved', () => {
    expect(planLaneOrder({ events: EVENTS, artists: ARTISTS, categories: CATEGORIES, programOrder: undefined, supportOrder: undefined }))
      .toEqual(['1', '2', '3', '6', '4', '5']);
  });
});

describe('the sets under each filter', () => {
  it('shows only the clashing Must-sees under Only conflicts', () => {
    expect(lanes('conflicts')).toEqual(['3: clash-b', '1: clash-a']);
    expect(day('conflicts').firstEventMs).toBe(wed('20:05'));
  });

  it('shows every Must-see under Must-see only, one over 3 h too; lands at the earliest', () => {
    expect(lanes('must')).toEqual(['3: clash-b', '1: clash-a', '2: solo', '5: long-ex']);
    expect(day('must').firstEventMs).toBe(wed('10:00'));
  });

  it("adds the Maybes, a support item's too, under Must-see and Maybe", () => {
    expect(lanes('maybe')).toEqual(['3: clash-b', '1: clash-a', '2: solo', '6: maybe', '5: long-ex sup-maybe']);
  });

  it('shows every band and every set of a picked pair under All sets: no support item where only the category, only the stage or only a "don\'t go" is picked', () => {
    expect(lanes('all')).toEqual([
      '3: clash-b c3-other',
      '1: unpicked nope clash-a',
      '2: nope-only solo',
      '6: maybe',
      '5: long-ex ex-other sup-maybe sup-other',
    ]);
  });

  it("shows another day's sets by that day's picks", () => {
    expect(lanes('all', THU)).toEqual(['1: thursday']);
  });

  it('shows only the bands under All sets on a day without a pick, a pair picked on another day included', () => {
    expect(lanes('all', FRI)).toEqual(['2: fri-band']);
  });

  it('shows no lane and has no landing on a day without a pick under the other filters', () => {
    const empty = day('maybe', FRI);
    expect([empty.lanes, empty.titles, empty.canvasHeight, empty.firstEventMs]).toEqual([[], [], RULER_HEIGHT, undefined]);
  });

  it('draws a set as my pick, with its clashes', () => {
    const sets = day('all').lanes.flatMap((lane) => lane.sets);
    const of = (id: string) => sets.find((s) => s.artist.artistId === id)!;
    expect([of('clash-a').status, of('clash-a').overlaps]).toEqual(['will_go', [CLASH]]);
    expect([of('nope').status, of('ex-other').status, of('ex-other').overlaps]).toEqual(['dont_go', 'none', undefined]);
  });
});

// What search follows in landscape (planSearchScope): the same rule, a set at a time.
describe('planTimelineRule', () => {
  const rule = planTimelineRule(INTERESTS, EVENTS, ARTISTS);
  const shows = (level: PlanFilterLevel, id: string, clashing = false): boolean => rule.shows(level, byId(id), clashing);

  it('shows any set of a picked pair under All sets, a "don\'t go" in it too', () => {
    expect(['ex-other', 'nope', 'long-ex'].map((id) => shows('all', id))).toEqual([true, true, true]);
  });

  it('shows every band under All sets, outside a picked pair and on a day without a pick too', () => {
    expect(['nope-only', 'fri-band'].map((id) => shows('all', id))).toEqual([true, true]);
  });

  it("shows no support item under All sets where only its category, only its stage, or only a \"don't go\" is picked, or only on another day", () => {
    expect(['ex-elsewhere', 'lecture', 'sup-nope', 'six-sup'].map((id) => shows('all', id))).toEqual([false, false, false, false]);
  });

  it('shows a band outside a picked pair under no other filter', () => {
    expect(['conflicts', 'must', 'maybe'].map((level) => shows(level as PlanFilterLevel, 'fri-band'))).toEqual([false, false, false]);
  });

  it('shows your picks at the level under the other filters, over 3 h too', () => {
    expect([shows('must', 'long-ex'), shows('must', 'sup-maybe'), shows('maybe', 'sup-maybe'), shows('maybe', 'ex-other')])
      .toEqual([true, false, true, false]);
  });

  it('shows only a clashing Must-see under Only conflicts', () => {
    expect([shows('conflicts', 'clash-a', true), shows('conflicts', 'solo')]).toEqual([true, false]);
  });
});
