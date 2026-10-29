import { planSetModel, SET_ROW_HEIGHT, type PlanSetInput } from './PlanSetRow.model';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── One set in My plan, as a model ────────────────────────────────────────────
//
// Its state, its texts (time range, status, countdown), its progress, where the
// now arrow sits and its clash bars all come from the set and "now", plus the
// overlaps and live Must-sees the plan hands it.

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
    expect(set.nowY).toBeCloseTo((23 / 60) * SET_ROW_HEIGHT.must);
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

describe('a Maybe pick', () => {
  const maybe = (over: Partial<PlanSetInput> = {}) => model({ level: 'maybe', ...over });

  it('is a short row with no status, live or not', () => {
    expect(maybe().height).toBe(SET_ROW_HEIGHT.maybe);
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
    expect(set.nowY).toBeCloseTo(0.5 * SET_ROW_HEIGHT.maybe);
  });
});

it('gives a Must-see the tall row', () => {
  expect(model().height).toBe(SET_ROW_HEIGHT.must);
});
