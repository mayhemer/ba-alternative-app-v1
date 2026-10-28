import { nowPillModel, nowPillTap, nowPillTarget, type NowPillModel } from './NowPill.model';
import { getFestivalDayStart } from '../timeline/timelineLayout';
import type { PlanInputs } from '../../utils/planUtils';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── What the now pill says ────────────────────────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
//   data     — today's Must-sees only; a Maybe live or ending between them
//              (ignored); a Maybe before the first Must-see (the pill still
//              counts to the Must-see, unlike the list); two Must-sees clashing;
//              sets over 2 h (never counted); no Must-see at all
//   time     — before 08:00; in the day-start break; exactly at a set's start
//              and end; mid-set; in a break between sets; after the last set
//   festival — a festival day; before the festival; after it
// The plan's filters (Maybe shown, conflicts only) never reach the pill.
//
// Expected values are written out by hand from the fixture times.

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at(7, '12:00'));
const FRI = getFestivalDayStart(at(8, '12:00'));
const DAYS = [THU, FRI];

const STAGES: DbStage[] = [{ slug: 'test', stageId: 's', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Stage' }] }];

type Spec = [id: string, name: string, from: number, to: number, status: string];

function setup(specs: Spec[]): { inputs: PlanInputs; interests: Record<string, string> } {
  const artists: DbArtist[] = [];
  const artistEvents: Record<string, DbEvent[]> = {};
  const interests: Record<string, string> = {};
  for (const [id, name, from, to, status] of specs) {
    artists.push({ slug: 'test', artistId: id, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] });
    artistEvents[id] = [{ slug: 'test', eventId: `e${id}`, dateFrom: from, dateTo: to, artistId: id, stageId: 's', categoryId: 'c' }];
    interests[id] = status;
  }
  return { inputs: { artists, stages: STAGES, artistEvents }, interests };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Thursday: Must-sees with a clash (Gojira × Batushka) and a Maybe between them. */
const DAY: Spec[] = [
  ['1', 'Hooded Menace', at(7, '14:00'), at(7, '14:40'), 'will_go'],
  ['3', 'Dark Funeral', at(7, '17:05'), at(7, '17:50'), 'will_go'],
  ['5', 'Gojira', at(7, '19:00'), at(7, '20:00'), 'will_go'],
  ['6', 'Batushka', at(7, '19:40'), at(7, '20:30'), 'will_go'],
  ['7', "Paysage d'Hiver", at(7, '20:10'), at(7, '21:00'), 'maybe'],
  ['8', 'Emperor', at(7, '22:30'), at(7, '23:45'), 'will_go'],
  ['9', 'Wolves in the Throne Room', at(8, '00:30'), at(8, '01:30'), 'will_go'],
  ['10', 'Spectral Wound', at(8, '12:30'), at(8, '13:10'), 'will_go'],
];

/** A Maybe before the day's first Must-see. */
const EARLY: Spec[] = [
  ['1', 'Early maybe', at(7, '12:00'), at(7, '12:40'), 'maybe'],
  ['2', 'First must', at(7, '14:00'), at(7, '14:40'), 'will_go'],
];

/** The day with sets over two hours that would come first, were they counted. */
const LONG: Spec[] = [
  ...DAY,
  // Would end before Gojira, and so be the one shown, were it counted.
  ['20', 'All-day exhibition', at(7, '12:00'), at(7, '19:30'), 'will_go'],
  // Would start before Emperor, and so be next, were it counted.
  ['21', 'Night installation', at(7, '21:00'), at(8, '03:00'), 'will_go'],
];

/** The day's sets, all picked as Maybe. */
const MAYBES_ONLY: Spec[] = DAY.map(([id, name, from, to]) => [id, name, from, to, 'maybe']);

/** The pill joins its times with narrow no-break spaces (U+202F); the cases write them as plain spaces. */
function narrow(time: string): string {
  return time.replace(/ /g, '\u202F');
}

function live(artistName: string, time: string, progress: number, more = 0): NowPillModel {
  return { kind: 'live', artistName, time: narrow(time), progress, more, accessibilityLabel: `${artistName} LIVE ${narrow(time)}` };
}

function countdown(artistName: string, time: string): NowPillModel {
  return { kind: 'break', artistName, time: narrow(time), accessibilityLabel: `${artistName} START ${narrow(time)}` };
}

const LOGO: NowPillModel = { kind: 'logo' };

// ── Corner cases ──────────────────────────────────────────────────────────────

const CASES: [name: string, data: Spec[], now: number, expected: NowPillModel][] = [
  // Time through a festival day
  ['before 08:00: the logo', DAY, at(7, '07:00'), LOGO],
  ['in the day-start break: counts from 08:00 to the first Must-see', DAY, at(7, '11:00'), countdown('Hooded Menace', '−3 h')],
  ['exactly at a set\'s start: live, all of it to go', DAY, at(7, '14:00'), live('Hooded Menace', '−40 min', 0)],
  ['exactly at a set\'s end: the break to the next', DAY, at(7, '14:40'), countdown('Dark Funeral', '−2 h 25')],
  ['mid-set: the time left and how far it has played', DAY, at(7, '19:23'), live('Gojira', '−37 min', 23 / 60)],
  ['two Must-sees clashing, both live: the one ending first, counting the other', DAY, at(7, '19:52'), live('Gojira', '−8 min', 52 / 60, 1)],
  ['in a break between sets', DAY, at(7, '21:10'), countdown('Emperor', '−1 h 20')],
  ['after the last set, until the 06:00 day change: the logo', DAY, at(8, '02:00'), LOGO],

  // The data
  ['a Maybe live in a break is ignored', DAY, at(7, '20:40'), countdown('Emperor', '−1 h 50')],
  ['a Maybe before the first Must-see: still counts to the Must-see (the list counts to the Maybe when shown)', EARLY, at(7, '11:00'), countdown('First must', '−3 h')],
  ['a Maybe live before the first Must-see is ignored', EARLY, at(7, '12:20'), countdown('First must', '−1 h 40')],
  ['sets over 2 h never count, live', LONG, at(7, '19:23'), live('Gojira', '−37 min', 23 / 60)],
  ['sets over 2 h never count, next', LONG, at(7, '20:40'), countdown('Emperor', '−1 h 50')],
  ['no Must-see picked: the logo', MAYBES_ONLY, at(7, '19:23'), LOGO],

  // The festival
  ['before the festival: the logo', DAY, at(5, '19:00'), LOGO],
  ['after the festival: the logo', DAY, at(12, '19:00'), LOGO],
];

describe('nowPillModel', () => {
  it.each(CASES)('%s', (_name, data, now, expected) => {
    const { inputs, interests } = setup(data);
    expect(nowPillModel(interests, inputs, DAYS, now)).toEqual(expected);
  });
});

// ── Where a tap goes ──────────────────────────────────────────────────────────
//
// The pill's set is the set a tap on My plan jumps to on the timeline: the one
// it names, on the festival day the timeline draws it on, on the main or the
// support timeline. Dimensions: live, live in a clash (the one ending first,
// not the other), the day-start break, a break, a set after midnight (the
// festival day, not the calendar date), a support set; the logo (no set).

/** `[eventId, support, day]` of the pill's set, or null for the logo. */
function target(data: Spec[], now: number, supportIds: string[] = []): [string, boolean, number] | null {
  const { inputs, interests } = setup(data);
  const artists = inputs.artists.map((a) => (supportIds.includes(a.artistId) ? { ...a, isPlayable: false } : a));
  const set = nowPillTarget(interests, { ...inputs, artists }, DAYS, now);
  if (set === null) {
    return null;
  }
  return [set.event.eventId, set.jump.support, set.jump.day];
}

describe('the set a tap goes to', () => {
  it('a live set: that set, on the main timeline, today', () => {
    expect(target(DAY, at(7, '19:23'))).toEqual(['e5', false, THU]);
  });

  it('two live Must-sees: Gojira, the one the pill names (ending first), not Batushka', () => {
    expect(target(DAY, at(7, '19:52'))).toEqual(['e5', false, THU]);
  });

  it('in the day-start break: the first Must-see', () => {
    expect(target(DAY, at(7, '11:00'))).toEqual(['e1', false, THU]);
  });

  it('in a break: the next Must-see', () => {
    expect(target(DAY, at(7, '21:10'))).toEqual(['e8', false, THU]);
  });

  it('a set after midnight: Thursday, the festival day it is drawn on, not Friday', () => {
    expect(target(DAY, at(8, '00:10'))).toEqual(['e9', false, THU]);
  });

  it('a support set: the support timeline', () => {
    expect(target(DAY, at(7, '19:23'), ['5'])).toEqual(['e5', true, THU]);
  });

  it('the logo: no set', () => {
    expect(target(DAY, at(7, '07:00'))).toBeNull();
  });
});

// ── What a tap does ───────────────────────────────────────────────────────────
//
// Dimensions: the screen shown (My plan, each other screen, none known yet) ×
// the pill (live, break, logo). On My plan a tap goes to the pill's set on the
// timeline; anywhere else to My plan at now. The logo has no set: no tap.

describe('nowPillTap', () => {
  const { inputs, interests } = setup(DAY);
  const gojiraLive = nowPillTarget(interests, inputs, DAYS, at(7, '19:23'));
  const emperorNext = nowPillTarget(interests, inputs, DAYS, at(7, '21:10'));

  it.each([['ArtistList'], ['Timeline'], ['SupportTimeline'], ['Settings'], [undefined]])(
    'on %s: My plan at now',
    (route) => {
      expect(nowPillTap(route, gojiraLive)).toEqual({ kind: 'plan' });
      expect(nowPillTap(route, emperorNext)).toEqual({ kind: 'plan' });
    },
  );

  it('on My plan, live: the live set on its timeline', () => {
    const tap = nowPillTap('MyPlan', gojiraLive);
    expect(tap.kind === 'timeline' && tap.target.event.eventId).toBe('e5');
  });

  it('on My plan, in a break: the next set on its timeline', () => {
    const tap = nowPillTap('MyPlan', emperorNext);
    expect(tap.kind === 'timeline' && tap.target.event.eventId).toBe('e8');
  });

  it('the logo does nothing, on My plan or elsewhere', () => {
    expect(nowPillTap('MyPlan', null)).toEqual({ kind: 'none' });
    expect(nowPillTap('ArtistList', null)).toEqual({ kind: 'none' });
  });
});
