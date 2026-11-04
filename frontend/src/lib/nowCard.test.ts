import { nowCardScript, nowCardState, sameNowCardScript, shouldAskNowCardPermission, type NowCardSet, type NowCardState } from './nowCard';
import { getFestivalDayStart } from '../utils/festivalTime';
import type { ConflictInputs } from './conflictUtils';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

// ── What the lock-screen now card says ────────────────────────────────────────
//
// Dimensions, and the corner cases tested for each:
//   data     — Must-sees back to back with breaks; a three-band clash group
//              (Gojira × Batushka × Mgła); a two-band clash (Meshuggah × Cult of
//              Luna) whose sets are later both live; a set after midnight that
//              belongs to the day before; a Maybe (never on the card); a
//              Must-see over 2 h (never on the card); a second festival day
//   time     — before 08:00 and at 08:00; exactly at a set's start and end;
//              in a break; while one, two or three clashing sets are live;
//              after the day's last set
//   festival — a festival day; before the festival; after it
// The main set is the now pill's (nowPillSet); the clash row is the next
// upcoming Must-see clashing with one that is live (My plan's START rule);
// `more` counts the clash group's unfinished bands the card doesn't show, and
// only in a group of three or more.
//
// Expected values are written out by hand from the fixture times.

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at(7, '12:00'));
const FRI = getFestivalDayStart(at(8, '12:00'));
const DAYS = [THU, FRI];

const STAGES: DbStage[] = [
  { slug: 'test', stageId: 'oct', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] },
  { slug: 'test', stageId: 'mg', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Metal Gate' }] },
];

type Spec = [id: string, name: string, stageId: string, from: number, to: number, status: string];

function setup(specs: Spec[]): { inputs: ConflictInputs; interests: Record<string, string> } {
  const artists: DbArtist[] = [];
  const artistEvents: Record<string, DbEvent[]> = {};
  const interests: Record<string, string> = {};
  for (const [id, name, stageId, from, to, status] of specs) {
    artists.push({ slug: 'test', artistId: id, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] });
    artistEvents[id] = [{ slug: 'test', eventId: `e${id}`, dateFrom: from, dateTo: to, artistId: id, stageId, categoryId: 'c' }];
    interests[id] = status;
  }
  return { inputs: { artists, stages: STAGES, artistEvents }, interests };
}

// ── Fixture: the mockup's day ─────────────────────────────────────────────────

const FESTIVAL: Spec[] = [
  ['1', 'Hooded Menace', 'oct', at(7, '11:30'), at(7, '12:10'), 'will_go'],
  ['2', 'Napalm Death', 'mg', at(7, '14:00'), at(7, '14:50'), 'will_go'],
  // A Maybe in the afternoon break: the card counts down past it, to Gojira.
  ['20', 'Maybe band', 'oct', at(7, '16:00'), at(7, '16:40'), 'maybe'],
  // Over two hours: never a Must-see on the card, though it would be live 12:10–14:00.
  ['21', 'Exhibition', 'oct', at(7, '12:00'), at(7, '18:00'), 'will_go'],
  ['3', 'Gojira', 'oct', at(7, '19:00'), at(7, '20:00'), 'will_go'],
  ['4', 'Batushka', 'mg', at(7, '19:40'), at(7, '20:30'), 'will_go'],
  ['5', 'Mgła', 'oct', at(7, '19:50'), at(7, '20:40'), 'will_go'],
  ['6', 'Meshuggah', 'oct', at(7, '22:15'), at(7, '23:30'), 'will_go'],
  ['7', 'Cult of Luna', 'mg', at(7, '23:00'), at(8, '00:00'), 'will_go'],
  // After midnight: still Thursday's festival day.
  ['8', 'Behemoth', 'oct', at(8, '00:20'), at(8, '01:30'), 'will_go'],
  ['9', 'Friday band', 'mg', at(8, '15:00'), at(8, '15:40'), 'will_go'],
];

const { inputs, interests } = setup(FESTIVAL);

// The card's sets, written out by hand.
const HOODED: NowCardSet = { eventId: 'e1', name: 'Hooded Menace', stage: 'Octagon', timeText: '11:30–12:10', start: at(7, '11:30'), end: at(7, '12:10') };
const NAPALM: NowCardSet = { eventId: 'e2', name: 'Napalm Death', stage: 'Metal Gate', timeText: '14:00–14:50', start: at(7, '14:00'), end: at(7, '14:50') };
const GOJIRA: NowCardSet = { eventId: 'e3', name: 'Gojira', stage: 'Octagon', timeText: '19:00–20:00', start: at(7, '19:00'), end: at(7, '20:00') };
const BATUSHKA: NowCardSet = { eventId: 'e4', name: 'Batushka', stage: 'Metal Gate', timeText: '19:40–20:30', start: at(7, '19:40'), end: at(7, '20:30') };
const MGLA: NowCardSet = { eventId: 'e5', name: 'Mgła', stage: 'Octagon', timeText: '19:50–20:40', start: at(7, '19:50'), end: at(7, '20:40') };
const MESHUGGAH: NowCardSet = { eventId: 'e6', name: 'Meshuggah', stage: 'Octagon', timeText: '22:15–23:30', start: at(7, '22:15'), end: at(7, '23:30') };
const CULT: NowCardSet = { eventId: 'e7', name: 'Cult of Luna', stage: 'Metal Gate', timeText: '23:00–00:00', start: at(7, '23:00'), end: at(8, '00:00') };
const BEHEMOTH: NowCardSet = { eventId: 'e8', name: 'Behemoth', stage: 'Octagon', timeText: '00:20–01:30', start: at(8, '00:20'), end: at(8, '01:30') };
const FRIDAY: NowCardSet = { eventId: 'e9', name: 'Friday band', stage: 'Metal Gate', timeText: '15:00–15:40', start: at(8, '15:00'), end: at(8, '15:40') };

function brk(next: NowCardSet): NowCardState {
  return { kind: 'break', next };
}

function live(set: NowCardSet, clash: NowCardSet | null = null, more = 0): NowCardState {
  return { kind: 'live', live: set, clash, more };
}

function stateAt(day: number, hm: string): NowCardState | null {
  return nowCardState(interests, inputs, DAYS, at(day, hm));
}

// ── One moment ────────────────────────────────────────────────────────────────

describe('nowCardState', () => {
  it('shows nothing before 08:00', () => {
    expect(stateAt(7, '07:59')).toBeNull();
  });

  it('counts down to the first Must-see from 08:00', () => {
    expect(stateAt(7, '08:00')).toEqual(brk(HOODED));
  });

  it('is live from the set\'s first minute', () => {
    expect(stateAt(7, '11:30')).toEqual(live(HOODED));
  });

  it('is a break again at the set\'s end', () => {
    expect(stateAt(7, '12:10')).toEqual(brk(NAPALM));
  });

  it('counts down past a Maybe to the next Must-see', () => {
    expect(stateAt(7, '16:20')).toEqual(brk(GOJIRA));
  });

  it('shows the next clashing band, and the group\'s third band as +1', () => {
    expect(stateAt(7, '19:12')).toEqual(live(GOJIRA, BATUSHKA, 1));
  });

  it('shows the latest live set, the next clash, and the still-live earlier one as +1', () => {
    expect(stateAt(7, '19:45')).toEqual(live(BATUSHKA, MGLA, 1));
  });

  it('with three live and none to come, shows no clash row and +2', () => {
    expect(stateAt(7, '19:55')).toEqual(live(MGLA, null, 2));
  });

  it('stops counting a group band once it has finished', () => {
    expect(stateAt(7, '20:10')).toEqual(live(MGLA, null, 1));
    expect(stateAt(7, '20:35')).toEqual(live(MGLA));
  });

  it('shows the next clash of a two-band group without +N', () => {
    expect(stateAt(7, '22:30')).toEqual(live(MESHUGGAH, CULT, 0));
  });

  it('with both bands of a two-band group live, shows only the later one', () => {
    expect(stateAt(7, '23:10')).toEqual(live(CULT));
  });

  it('keeps a set after midnight on the day before', () => {
    expect(stateAt(8, '00:10')).toEqual(brk(BEHEMOTH));
    expect(stateAt(8, '00:45')).toEqual(live(BEHEMOTH));
  });

  it('shows nothing after the day\'s last Must-see', () => {
    expect(stateAt(8, '01:30')).toBeNull();
    expect(stateAt(8, '07:00')).toBeNull();
  });

  it('shows nothing before or after the festival', () => {
    expect(stateAt(6, '12:00')).toBeNull();
    expect(stateAt(10, '12:00')).toBeNull();
  });
});

// ── The whole festival, precomputed ──────────────────────────────────────────

describe('nowCardScript', () => {
  it('lists every state with its time span, merging spans that show the same', () => {
    expect(nowCardScript(interests, inputs, DAYS)).toEqual([
      { from: at(7, '08:00'), to: at(7, '11:30'), state: brk(HOODED) },
      { from: at(7, '11:30'), to: at(7, '12:10'), state: live(HOODED) },
      { from: at(7, '12:10'), to: at(7, '14:00'), state: brk(NAPALM) },
      { from: at(7, '14:00'), to: at(7, '14:50'), state: live(NAPALM) },
      { from: at(7, '14:50'), to: at(7, '19:00'), state: brk(GOJIRA) },
      { from: at(7, '19:00'), to: at(7, '19:40'), state: live(GOJIRA, BATUSHKA, 1) },
      { from: at(7, '19:40'), to: at(7, '19:50'), state: live(BATUSHKA, MGLA, 1) },
      { from: at(7, '19:50'), to: at(7, '20:00'), state: live(MGLA, null, 2) },
      { from: at(7, '20:00'), to: at(7, '20:30'), state: live(MGLA, null, 1) },
      { from: at(7, '20:30'), to: at(7, '20:40'), state: live(MGLA) },
      { from: at(7, '20:40'), to: at(7, '22:15'), state: brk(MESHUGGAH) },
      { from: at(7, '22:15'), to: at(7, '23:00'), state: live(MESHUGGAH, CULT, 0) },
      // Meshuggah ends at 23:30, but the card shows the same before and after.
      { from: at(7, '23:00'), to: at(8, '00:00'), state: live(CULT) },
      { from: at(8, '00:00'), to: at(8, '00:20'), state: brk(BEHEMOTH) },
      { from: at(8, '00:20'), to: at(8, '01:30'), state: live(BEHEMOTH) },
      { from: at(8, '08:00'), to: at(8, '15:00'), state: brk(FRIDAY) },
      { from: at(8, '15:00'), to: at(8, '15:40'), state: live(FRIDAY) },
    ]);
  });

  it('is empty with no Must-see', () => {
    const maybes = setup(FESTIVAL.map(([id, name, stage, from, to]) => [id, name, stage, from, to, 'maybe']));
    expect(nowCardScript(maybes.interests, maybes.inputs, DAYS)).toEqual([]);
  });
});

// ── Asking for Android's notification permission ─────────────────────────────

describe('shouldAskNowCardPermission', () => {
  const script = nowCardScript(interests, inputs, DAYS);

  it('asks on a festival day with a Must-see still to come or live', () => {
    expect(shouldAskNowCardPermission(script, DAYS, at(7, '10:00'), false)).toBe(true);
    expect(shouldAskNowCardPermission(script, DAYS, at(8, '00:45'), false)).toBe(true);
  });

  it('asks only once', () => {
    expect(shouldAskNowCardPermission(script, DAYS, at(7, '10:00'), true)).toBe(false);
  });

  it('does not ask once the day\'s last Must-see is over', () => {
    expect(shouldAskNowCardPermission(script, DAYS, at(8, '02:00'), false)).toBe(false);
  });

  it('does not ask before the festival', () => {
    expect(shouldAskNowCardPermission(script, DAYS, at(6, '12:00'), false)).toBe(false);
  });
});

// ── Whether the card needs a new script ──────────────────────────────────────

describe('sameNowCardScript', () => {
  it('is the same when recomputed from the same picks, and after a Maybe pick', () => {
    const again = nowCardScript({ ...interests, 20: 'none' }, inputs, DAYS);
    expect(sameNowCardScript(nowCardScript(interests, inputs, DAYS), again)).toBe(true);
  });

  it('differs when a Must-see is added', () => {
    const more = nowCardScript({ ...interests, 20: 'will_go' }, inputs, DAYS);
    expect(sameNowCardScript(nowCardScript(interests, inputs, DAYS), more)).toBe(false);
  });

  it('differs when only a stage name changes', () => {
    const renamed = setup(FESTIVAL);
    renamed.inputs.stages = [{ ...STAGES[0], localized: [{ language: 'en', name: 'Octagon Stage' }] }, STAGES[1]];
    expect(sameNowCardScript(nowCardScript(interests, inputs, DAYS), nowCardScript(renamed.interests, renamed.inputs, DAYS))).toBe(false);
  });
});
