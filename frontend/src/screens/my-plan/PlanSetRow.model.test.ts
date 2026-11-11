import { planSetModel, SET_ROW_HEIGHT, type PlanSetInput } from './PlanSetRow.model';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── One set in My plan, as a model ────────────────────────────────────────────
//
// Its state, its texts (time range, status, countdown), its progress, where the
// now arrow sits and its clash bars all come from the set and "now", plus the
// overlaps and live Must-sees the plan hands it. Its look comes from its pick
// level and whether the list shows All sets. The dimensions: the pick level
// (Must-see, Maybe, unpicked, don't go), All sets or another filter, and now
// (before, during, after the set).

function at(hm: string): number {
  return Date.parse(`2025-08-07T${hm}:00+02:00`);
}

function event(id: string, from: string, to: string): DbEvent {
  return { slug: 'test', eventId: id, dateFrom: at(from), dateTo: at(to), artistId: id, stageId: 's1', categoryId: 'c' };
}

const ARTIST: DbArtist = { slug: 'test', artistId: 'g', name: 'Gojira', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
const STAGE: DbStage = { slug: 'test', stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] };
const GOJIRA = event('gojira', '19:00', '20:00');
const BATUSHKA = event('batushka', '19:40', '20:30');

function model(over: Partial<PlanSetInput> = {}) {
  return planSetModel({
    event: GOJIRA,
    artist: ARTIST,
    stage: STAGE,
    level: 'will_go',
    now: at('12:00'),
    overlaps: [],
    liveMusts: [],
    conflictHead: false,
    allSets: false,
    ...over,
  });
}

describe('texts', () => {
  it('shows the time range and the stage, and says all three to a screen reader', () => {
    const set = model();
    expect(set.timeText).toBe('19:00–20:00');
    expect(set.stageName).toBe('Octagon');
    expect(set.accessibilityLabel).toBe('Gojira, 19:00–20:00, Octagon');
  });

  it('has no stage name for an unknown stage', () => {
    expect(model({ stage: undefined }).stageName).toBe('');
  });
});

describe('state over time', () => {
  it('is upcoming before it starts, with no status, fill or arrow', () => {
    expect(model({ now: at('18:59') })).toMatchObject({ state: 'upcoming', status: { kind: 'none' }, progress: 0, nowY: null });
  });

  it('is live from its first minute, the arrow at its top', () => {
    expect(model({ now: at('19:00') })).toMatchObject({ state: 'live', status: { kind: 'live', label: 'LIVE', time: '−1 h' }, progress: 0, nowY: 0 });
  });

  it('shows how far it has played and the time left, the arrow at the tip of the fill', () => {
    const set = model({ now: at('19:23') });
    expect(set.status).toEqual({ kind: 'live', label: 'LIVE', time: '−37 min' });
    expect(set.progress).toBeCloseTo(23 / 60);
    expect(set.nowY).toBeCloseTo((23 / 60) * SET_ROW_HEIGHT.tall);
  });

  it('is done the minute it ends', () => {
    expect(model({ now: at('20:00') })).toMatchObject({ state: 'past', status: { kind: 'done', label: 'done' }, progress: 0, nowY: null });
  });

  it('is upcoming outside the festival, whatever the date', () => {
    expect(model({ now: Number.NEGATIVE_INFINITY })).toMatchObject({ state: 'upcoming', status: { kind: 'none' } });
  });
});

describe('clashes', () => {
  it('places a clash bar where it overlaps another Must-see, as a fraction of the set', () => {
    expect(model({ overlaps: [{ from: at('19:40'), to: at('20:00') }] }).clashBars).toEqual([{ from: 40 / 60, to: 1 }]);
  });

  it('counts down to its start while a Must-see it clashes with is live', () => {
    const set = model({ event: BATUSHKA, now: at('19:23'), liveMusts: [GOJIRA] });
    expect(set.status).toEqual({ kind: 'start', label: 'START', time: '−17 min' });
  });

  it('has no countdown when the live Must-see does not overlap it', () => {
    expect(model({ event: event('emperor', '22:30', '23:45'), now: at('19:23'), liveMusts: [GOJIRA] }).status).toEqual({ kind: 'none' });
  });

  it('shows LIVE rather than START once both have started', () => {
    expect(model({ event: BATUSHKA, now: at('19:52'), liveMusts: [GOJIRA, BATUSHKA] }).status).toEqual({ kind: 'live', label: 'LIVE', time: '−38 min' });
  });

  it('carries the conflict title when it heads a clash group', () => {
    expect(model({ conflictHead: true }).conflictHead).toBe(true);
  });
});

describe('a Maybe pick under a filter other than All sets', () => {
  const maybe = (over: Partial<PlanSetInput> = {}) => model({ level: 'maybe', ...over });

  it('is a compact one-line row with no status, live or not', () => {
    expect(maybe()).toMatchObject({ compact: true, height: SET_ROW_HEIGHT.compact });
    expect(maybe({ now: at('19:23') })).toMatchObject({ state: 'live', status: { kind: 'none' } });
    expect(maybe({ now: at('20:30') })).toMatchObject({ state: 'past', status: { kind: 'none' } });
  });

  it('never clashes: no bars, no title, no countdown', () => {
    const set = maybe({
      event: BATUSHKA,
      now: at('19:23'),
      overlaps: [{ from: at('19:40'), to: at('20:00') }],
      liveMusts: [GOJIRA],
      conflictHead: true,
    });
    expect(set.clashBars).toEqual([]);
    expect(set.conflictHead).toBe(false);
    expect(set.status).toEqual({ kind: 'none' });
  });

  it('still shows how far it has played, the arrow at the tip', () => {
    const set = maybe({ now: at('19:30') });
    expect(set.progress).toBeCloseTo(0.5);
    expect(set.nowY).toBeCloseTo(0.5 * SET_ROW_HEIGHT.compact);
  });
});

describe('a Maybe pick under All sets', () => {
  const maybe = (over: Partial<PlanSetInput> = {}) => model({ level: 'maybe', allSets: true, ...over });

  it('is a tall row, live and done like a Must-see', () => {
    expect(maybe()).toMatchObject({ compact: false, height: SET_ROW_HEIGHT.tall });
    expect(maybe({ now: at('19:23') })).toMatchObject({ state: 'live', status: { kind: 'live', label: 'LIVE', time: '−37 min' } });
    expect(maybe({ now: at('20:00') })).toMatchObject({ state: 'past', status: { kind: 'done', label: 'done' } });
  });

  it('never clashes: no bars, no title, and no countdown to its start beside a live Must-see', () => {
    const set = maybe({
      event: BATUSHKA,
      now: at('19:23'),
      overlaps: [{ from: at('19:40'), to: at('20:00') }],
      liveMusts: [GOJIRA],
      conflictHead: true,
    });
    expect(set.clashBars).toEqual([]);
    expect(set.conflictHead).toBe(false);
    expect(set.status).toEqual({ kind: 'none' });
  });

  it('puts the arrow at the tip of the fill along the tall row', () => {
    expect(maybe({ now: at('19:30') }).nowY).toBeCloseTo(0.5 * SET_ROW_HEIGHT.tall);
  });
});

describe.each([
  ['an unpicked set', 'none'],
  ['a "don\'t go" set', 'dont_go'],
] as const)('%s (All sets only)', (_kind, level) => {
  const set = (over: Partial<PlanSetInput> = {}) => model({ level, allSets: true, ...over });

  it('is a tall row, live and done like a Must-see', () => {
    expect(set()).toMatchObject({ compact: false, height: SET_ROW_HEIGHT.tall });
    expect(set({ now: at('19:23') })).toMatchObject({ state: 'live', status: { kind: 'live', label: 'LIVE', time: '−37 min' } });
    expect(set({ now: at('20:00') })).toMatchObject({ state: 'past', status: { kind: 'done', label: 'done' } });
  });

  it('never clashes: no bars, no title, and no countdown to its start beside a live Must-see', () => {
    const row = set({
      event: BATUSHKA,
      now: at('19:23'),
      overlaps: [{ from: at('19:40'), to: at('20:00') }],
      liveMusts: [GOJIRA],
      conflictHead: true,
    });
    expect(row.clashBars).toEqual([]);
    expect(row.conflictHead).toBe(false);
    expect(row.status).toEqual({ kind: 'none' });
  });
});

it('gives a Must-see the tall row under every filter', () => {
  expect(model()).toMatchObject({ compact: false, height: SET_ROW_HEIGHT.tall });
  expect(model({ allSets: true })).toMatchObject({ compact: false, height: SET_ROW_HEIGHT.tall });
});

// ── The look: box, border, text, star, progress colours ───────────────────────

describe('the box', () => {
  it.each([
    // level,    allSets, fill,       edge
    ['will_go', false, 'category', 'solid'],
    ['will_go', true,  'category', 'solid'],
    ['maybe',   false, 'raised',   'dotted'],
    ['maybe',   true,  'raised',   'dotted'],
    ['none',    true,  'raised',   null],
    ['dont_go', true,  'none',     null],
  ] as const)('a %s set (All sets: %s) is filled %s, its left edge %s', (level, allSets, fill, edge) => {
    expect(model({ level, allSets })).toMatchObject({ fill, edge });
  });
});

describe('the text', () => {
  it('is dimmed on a "don\'t go" set only', () => {
    expect(model({ level: 'dont_go', allSets: true }).dimmed).toBe(true);
    expect(model({ level: 'none', allSets: true }).dimmed).toBe(false);
    expect(model({ level: 'maybe', allSets: true }).dimmed).toBe(false);
    expect(model({ allSets: true }).dimmed).toBe(false);
  });
});

describe('the star at the end of the name line', () => {
  it('shows every set\'s pick under All sets', () => {
    expect(model({ allSets: true }).star).toBe('will_go');
    expect(model({ level: 'maybe', allSets: true }).star).toBe('maybe');
    expect(model({ level: 'none', allSets: true }).star).toBe('none');
    expect(model({ level: 'dont_go', allSets: true }).star).toBe('dont_go');
  });

  it('is on no row under any other filter', () => {
    expect(model().star).toBeNull();
    expect(model({ level: 'maybe' }).star).toBeNull();
  });
});

describe('the live accent border', () => {
  it('is on a Must-see while it plays, under every filter', () => {
    expect(model({ now: at('19:23') }).liveBorder).toBe(true);
    expect(model({ now: at('19:23'), allSets: true }).liveBorder).toBe(true);
  });

  it('is not on a Must-see before or after it plays', () => {
    expect(model({ now: at('18:59') }).liveBorder).toBe(false);
    expect(model({ now: at('20:00') }).liveBorder).toBe(false);
  });

  it('is on no other set, live or not', () => {
    expect(model({ level: 'maybe', now: at('19:23') }).liveBorder).toBe(false);
    expect(model({ level: 'maybe', allSets: true, now: at('19:23') }).liveBorder).toBe(false);
    expect(model({ level: 'none', allSets: true, now: at('19:23') }).liveBorder).toBe(false);
    expect(model({ level: 'dont_go', allSets: true, now: at('19:23') }).liveBorder).toBe(false);
  });
});

describe('the live progress bar', () => {
  it('is the accent on a Must-see and grey on every other set', () => {
    expect(model().progressColors).toBe('live');
    expect(model({ level: 'maybe' }).progressColors).toBe('maybeLive');
    expect(model({ level: 'maybe', allSets: true }).progressColors).toBe('maybeLive');
    expect(model({ level: 'none', allSets: true }).progressColors).toBe('maybeLive');
    expect(model({ level: 'dont_go', allSets: true }).progressColors).toBe('maybeLive');
  });
});
