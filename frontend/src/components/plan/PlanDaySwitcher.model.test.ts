import { planDaySwitcherModel, type PlanDaySwitcherInputs } from './PlanDaySwitcher.model';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── My plan's day switcher, as a model ────────────────────────────────────────
//
// The timeline's day buttons, with what the plan decides for them: which day is
// today, which one is shown, and — only while "Show only conflicts" is on — the
// days with a Must-see clash. The clash days come from the conflict calculation
// itself (daysWithClash), the source the conflicts-only list follows too, so a
// striped day is exactly a day that list has sets on.
//
// Dimensions, and the corner cases tested for each:
//   filters  — Show only conflicts off / on (Show Maybe never changes the buttons)
//   data     — a Must-see clash; a Maybe over a Must-see; a "don't go" over a
//              Must-see; a set over 2 h over a Must-see; sets back to back; a
//              clash across 06:00, whose sets start on two festival days
//   time     — now on a festival day; the 05:59 before the next day
//   festival — a festival day; before the festival; after it
//   shown    — today, or another day

const at = (iso: string): number => Date.parse(iso);

const WED = at('2025-08-06T06:00:00+02:00');
const THU = at('2025-08-07T06:00:00+02:00');
const FRI = at('2025-08-08T06:00:00+02:00');
const SAT = at('2025-08-09T06:00:00+02:00');
const DAYS = [WED, THU, FRI, SAT];

type Pick = 'will_go' | 'maybe' | 'dont_go';
type Set = { id: string; from: string; to: string; pick: Pick };

function inputs(sets: Set[], overrides: Partial<PlanDaySwitcherInputs> = {}): PlanDaySwitcherInputs {
  const artists: DbArtist[] = sets.map((s) => ({ slug: 't', artistId: s.id, name: s.id, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] }));
  const events: DbEvent[] = sets.map((s) => ({ slug: 't', eventId: `e${s.id}`, artistId: s.id, stageId: 's', categoryId: 'c', dateFrom: at(s.from), dateTo: at(s.to) }));
  const stages: DbStage[] = [{ slug: 't', stageId: 's', imageUrl: '', thumbUrl: '', localized: [] }];
  return {
    festivalDays: DAYS,
    shownDay: THU,
    now: at('2025-08-07T15:00:00+02:00'),
    conflictsOnly: true,
    interests: Object.fromEntries(sets.map((s) => [s.id, s.pick])),
    inputs: { artists, stages, artistEvents: Object.fromEntries(events.map((e) => [e.artistId, [e]])) },
    ...overrides,
  };
}

/** The days a model stripes, as weekday names. */
function striped(model: ReturnType<typeof planDaySwitcherModel>): string[] {
  return model.buttons.filter((b) => b.clash).map((b) => b.weekday);
}

// A Must-see clash on Thursday evening.
const THU_CLASH: Set[] = [
  { id: 'gojira', from: '2025-08-07T19:00:00+02:00', to: '2025-08-07T20:00:00+02:00', pick: 'will_go' },
  { id: 'batushka', from: '2025-08-07T19:40:00+02:00', to: '2025-08-07T20:30:00+02:00', pick: 'will_go' },
];

describe('the clash stripes', () => {
  it('are off while "Show only conflicts" is off, on a day with a Must-see clash too', () => {
    expect(striped(planDaySwitcherModel(inputs(THU_CLASH, { conflictsOnly: false })))).toEqual([]);
  });

  it('mark the day with a Must-see clash while "Show only conflicts" is on, and no other', () => {
    expect(striped(planDaySwitcherModel(inputs(THU_CLASH)))).toEqual(['Thu']);
  });

  it('skip a Maybe over a Must-see: only Must-sees clash', () => {
    expect(striped(planDaySwitcherModel(inputs([
      { id: 'a', from: '2025-08-08T18:00:00+02:00', to: '2025-08-08T19:00:00+02:00', pick: 'will_go' },
      { id: 'b', from: '2025-08-08T18:30:00+02:00', to: '2025-08-08T19:15:00+02:00', pick: 'maybe' },
    ])))).toEqual([]);
  });

  it('skip a "don\'t go" over a Must-see', () => {
    expect(striped(planDaySwitcherModel(inputs([
      { id: 'a', from: '2025-08-08T18:00:00+02:00', to: '2025-08-08T19:00:00+02:00', pick: 'will_go' },
      { id: 'b', from: '2025-08-08T18:30:00+02:00', to: '2025-08-08T19:15:00+02:00', pick: 'dont_go' },
    ])))).toEqual([]);
  });

  it('skip a Must-see over 2 h, which clashes with nothing', () => {
    expect(striped(planDaySwitcherModel(inputs([
      { id: 'exhibition', from: '2025-08-09T12:00:00+02:00', to: '2025-08-09T14:01:00+02:00', pick: 'will_go' },
      { id: 'a', from: '2025-08-09T13:00:00+02:00', to: '2025-08-09T13:45:00+02:00', pick: 'will_go' },
    ])))).toEqual([]);
  });

  it('skip Must-sees back to back: one ending as the next starts is no clash', () => {
    expect(striped(planDaySwitcherModel(inputs([
      { id: 'a', from: '2025-08-08T18:00:00+02:00', to: '2025-08-08T19:00:00+02:00', pick: 'will_go' },
      { id: 'b', from: '2025-08-08T19:00:00+02:00', to: '2025-08-08T19:45:00+02:00', pick: 'will_go' },
    ])))).toEqual([]);
  });

  it('mark both days of a clash across 06:00: each day its sets start on', () => {
    expect(striped(planDaySwitcherModel(inputs([
      // Starts Saturday 05:30, so it is Friday night's set.
      { id: 'late', from: '2025-08-09T05:30:00+02:00', to: '2025-08-09T06:30:00+02:00', pick: 'will_go' },
      { id: 'early', from: '2025-08-09T06:00:00+02:00', to: '2025-08-09T06:40:00+02:00', pick: 'will_go' },
    ])))).toEqual(['Fri', 'Sat']);
  });
});

describe('today and the shown day', () => {
  it('marks the festival day that holds now as today, and the shown day as selected', () => {
    const model = planDaySwitcherModel(inputs([], { shownDay: FRI }));
    expect(model.today).toBe(THU);
    expect(model.buttons.map((b) => [b.weekday, b.today, b.selected])).toEqual([
      ['Wed', false, false],
      ['Thu', true, false],
      ['Fri', false, true],
      ['Sat', false, false],
    ]);
  });

  it('keeps today on the day before until 06:00', () => {
    expect(planDaySwitcherModel(inputs([], { now: at('2025-08-08T05:59:00+02:00') })).today).toBe(THU);
  });

  it('has no today before the festival', () => {
    const model = planDaySwitcherModel(inputs([], { shownDay: WED, now: at('2025-08-01T12:00:00+02:00') }));
    expect(model.today).toBeNull();
    expect(model.buttons.some((b) => b.today)).toBe(false);
  });

  it('has no today after the festival', () => {
    expect(planDaySwitcherModel(inputs([], { shownDay: SAT, now: at('2025-08-10T06:00:00+02:00') })).today).toBeNull();
  });

  it('has no buttons for an edition with no days', () => {
    expect(planDaySwitcherModel(inputs([], { festivalDays: [], shownDay: 0 })).buttons).toEqual([]);
  });
});
