import {
  buildPlanDay,
  daysWithClash,
  defaultPlanDay,
  gapHeight,
  itemOffsets,
  nowScrollOffset,
  PLAN_LAYOUT,
  type PlanInputs,
  type PlanItem,
  type PlanSetItem,
  type PlanGapItem,
} from './planUtils';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// A hand-made day, so every expected value can be worked out by hand. Thursday
// 7 Aug 2025 is the "plan day"; its festival day runs 06:00 Thu → 06:00 Fri, so
// the 00:30 Wolves set still belongs to Thursday.

const MIN = 60 * 1000;

/** Unix ms of a festival wall-clock time, e.g. at(7, '19:23') = Thu 7 Aug 19:23. */
function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at(7, '12:00'));
const FRI = getFestivalDayStart(at(8, '12:00'));
const SAT = getFestivalDayStart(at(9, '12:00'));
const SUN = getFestivalDayStart(at(10, '12:00'));

function stage(stageId: string, name: string): DbStage {
  return { slug: 'test', stageId, imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name }] };
}

function artist(artistId: string, name: string): DbArtist {
  return { slug: 'test', artistId, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}

type Spec = [id: string, name: string, stageId: string, from: number, to: number, status: string];

function inputsOf(specs: Spec[]): { inputs: PlanInputs; interests: Record<string, string> } {
  const artists: DbArtist[] = [];
  const artistEvents: Record<string, DbEvent[]> = {};
  const interests: Record<string, string> = {};
  for (const [id, name, stageId, from, to, status] of specs) {
    artists.push(artist(id, name));
    artistEvents[id] = [{ slug: 'test', eventId: `e${id}`, dateFrom: from, dateTo: to, artistId: id, stageId, categoryId: 'c' }];
    if (status !== 'none') {
      interests[id] = status;
    }
  }
  const stages = [stage('s1', 'Octagon'), stage('s2', 'Metal Gate'), stage('s3', 'Jägermeister')];
  return { inputs: { artists, stages, artistEvents }, interests };
}

const DAY: Spec[] = [
  ['1', 'Hooded Menace', 's1', at(7, '14:00'), at(7, '14:40'), 'will_go'],
  ['2', 'Blood Incantation', 's2', at(7, '15:30'), at(7, '16:15'), 'maybe'],
  ['3', 'Dark Funeral', 's3', at(7, '17:05'), at(7, '17:50'), 'will_go'],
  ['4', 'Mgła', 's1', at(7, '17:55'), at(7, '18:40'), 'will_go'],
  ['5', 'Gojira', 's3', at(7, '19:00'), at(7, '20:00'), 'will_go'],
  ['6', 'Batushka', 's2', at(7, '19:40'), at(7, '20:30'), 'will_go'],
  ['7', "Paysage d'Hiver", 's1', at(7, '20:10'), at(7, '21:00'), 'maybe'],
  ['8', 'Emperor', 's3', at(7, '22:30'), at(7, '23:45'), 'will_go'],
  ['9', 'Wolves in the Throne Room', 's1', at(8, '00:30'), at(8, '01:30'), 'will_go'],
  ['10', 'Spectral Wound', 's1', at(8, '12:30'), at(8, '13:10'), 'will_go'],
  ['11', 'Not picked', 's2', at(7, '18:00'), at(7, '18:30'), 'none'],
  ['12', 'Not going', 's2', at(7, '21:00'), at(7, '21:30'), 'dont_go'],
];

const { inputs, interests } = inputsOf(DAY);

function build(now: number, opts: Partial<{ dayStart: number; showMaybe: boolean; conflictsOnly: boolean; duringFestival: boolean }> = {}): PlanItem[] {
  return buildPlanDay(interests, inputs, {
    dayStart: opts.dayStart ?? THU,
    now,
    duringFestival: opts.duringFestival ?? true,
    showMaybe: opts.showMaybe ?? false,
    conflictsOnly: opts.conflictsOnly ?? false,
  });
}

/** A compact, readable description of the item sequence. */
function shape(items: PlanItem[]): string[] {
  return items.map((item) => {
    switch (item.kind) {
      case 'set': return `${item.level === 'will_go' ? 'must' : 'maybe'}:${item.artist.name}`;
      case 'gap': return `gap:${item.minutes}${item.current ? '*' : ''}${item.opening ? '^' : ''}`;
      case 'cap': return `cap:${item.edge}`;
      default: return item.kind;
    }
  });
}

function set(items: PlanItem[], name: string): PlanSetItem {
  const found = items.find((i): i is PlanSetItem => i.kind === 'set' && i.artist.name === name);
  if (found === undefined) {
    throw new Error(`no set for ${name}`);
  }
  return found;
}

function gaps(items: PlanItem[]): PlanGapItem[] {
  return items.filter((i): i is PlanGapItem => i.kind === 'gap');
}

// ── Gap height ────────────────────────────────────────────────────────────────

describe('gapHeight', () => {
  it('is a floor plus linear growth, so 35 min and 2 h read clearly apart', () => {
    expect(gapHeight(5)).toBe(23);
    expect(gapHeight(35)).toBe(38);
    expect(gapHeight(120)).toBe(80);
  });

  it('never drops below the floor that fits the label', () => {
    expect(gapHeight(1)).toBeGreaterThanOrEqual(20);
  });

  it('is capped for very long breaks', () => {
    expect(gapHeight(400)).toBe(160);
  });
});

// ── Default day ───────────────────────────────────────────────────────────────

describe('defaultPlanDay', () => {
  const days = [THU, FRI, SAT];

  it('is today on a festival day', () => {
    expect(defaultPlanDay(days, at(8, '14:00'))).toBe(FRI);
  });

  it('follows the 06:00 boundary: 03:00 Friday is still Thursday', () => {
    expect(defaultPlanDay(days, at(8, '03:00'))).toBe(THU);
  });

  it('is the first day before the festival and the last day after it', () => {
    expect(defaultPlanDay(days, at(5, '12:00'))).toBe(THU);
    expect(defaultPlanDay(days, at(12, '12:00'))).toBe(SAT);
  });

  it('is 0 when the edition has no days', () => {
    expect(defaultPlanDay([], at(7, '12:00'))).toBe(0);
  });
});

// ── One day of the plan ───────────────────────────────────────────────────────

describe('buildPlanDay', () => {
  it('lists the day\'s Must-sees between the day caps, with gaps between them', () => {
    expect(shape(build(at(7, '19:23')))).toEqual([
      'title',
      'cap:start',
      'must:Hooded Menace',
      'gap:145',
      'must:Dark Funeral',
      'gap:5',
      'must:Mgła',
      'gap:20',
      'must:Gojira',
      'must:Batushka',
      'gap:120',
      'must:Emperor',
      'gap:45',
      'must:Wolves in the Throne Room',
      'cap:end',
    ]);
  });

  it('leaves out unpicked, "don\'t go" and other days\' sets', () => {
    const names = build(at(7, '19:23')).flatMap((i) => (i.kind === 'set' ? [i.artist.name] : []));
    expect(names).not.toContain('Not picked');
    expect(names).not.toContain('Not going');
    expect(names).not.toContain('Spectral Wound');
  });

  it('marks past, live and upcoming sets, with the live progress and time left', () => {
    const items = build(at(7, '19:23'));
    expect(set(items, 'Mgła').state).toBe('past');
    const gojira = set(items, 'Gojira');
    expect(gojira.state).toBe('live');
    expect(gojira.progress).toBeCloseTo(23 / 60);
    expect(gojira.remainingMs).toBe(37 * MIN);
    expect(set(items, 'Emperor').state).toBe('upcoming');
  });

  it('places the clash bars where each set overlaps another Must-see, as fractions of the set', () => {
    const items = build(at(7, '19:23'));
    const gojira = set(items, 'Gojira');
    const batushka = set(items, 'Batushka');
    expect(gojira.clashBars).toHaveLength(1);
    expect(gojira.clashBars[0].from).toBeCloseTo(40 / 60);
    expect(gojira.clashBars[0].to).toBeCloseTo(1);
    expect(batushka.clashBars[0].from).toBeCloseTo(0);
    expect(batushka.clashBars[0].to).toBeCloseTo(20 / 50);
    expect(set(items, 'Emperor').clashBars).toEqual([]);
  });

  it('puts the group title on the first set of a clash group only', () => {
    const items = build(at(7, '19:23'));
    expect(set(items, 'Gojira').conflictHead).toBe(true);
    expect(set(items, 'Gojira').overlappingEvents.map((e) => e.artistId)).toEqual(['6']);
    expect(set(items, 'Batushka').conflictHead).toBe(false);
  });

  it('counts down to an upcoming set that clashes with one live now', () => {
    const items = build(at(7, '19:23'));
    expect(set(items, 'Batushka').startsInMs).toBe(17 * MIN);
    // Not clashing with anything live: no countdown.
    expect(set(items, 'Emperor').startsInMs).toBeNull();
  });

  it('shows both clashing sets as live once both have started', () => {
    const items = build(at(7, '19:52'));
    expect(set(items, 'Gojira').state).toBe('live');
    expect(set(items, 'Gojira').progress).toBeCloseTo(52 / 60);
    expect(set(items, 'Batushka').state).toBe('live');
    expect(set(items, 'Batushka').progress).toBeCloseTo(12 / 50);
    expect(set(items, 'Batushka').startsInMs).toBeNull();
  });

  it('gives Must-see and Maybe rows their fixed heights', () => {
    const items = build(at(7, '19:23'), { showMaybe: true });
    expect(set(items, 'Gojira').height).toBe(PLAN_LAYOUT.mustRow);
    expect(set(items, 'Blood Incantation').height).toBe(PLAN_LAYOUT.maybeRow);
  });

  it('adds Maybe picks only when asked, never marked as clashing', () => {
    expect(shape(build(at(7, '19:23'), { showMaybe: true }))).toEqual([
      'title',
      'cap:start',
      'must:Hooded Menace',
      'gap:50',
      'maybe:Blood Incantation',
      'gap:50',
      'must:Dark Funeral',
      'gap:5',
      'must:Mgła',
      'gap:20',
      'must:Gojira',
      'must:Batushka',
      "maybe:Paysage d'Hiver",
      'gap:90',
      'must:Emperor',
      'gap:45',
      'must:Wolves in the Throne Room',
      'cap:end',
    ]);
    const paysage = set(build(at(7, '19:23'), { showMaybe: true }), "Paysage d'Hiver");
    expect(paysage.clashBars).toEqual([]);
    expect(paysage.conflictHead).toBe(false);
    expect(paysage.startsInMs).toBeNull();
  });

  it('sizes gaps by their length and marks the one now falls in', () => {
    const items = build(at(7, '21:10'));
    const current = gaps(items).filter((g) => g.current);
    expect(current).toHaveLength(1);
    expect(current[0].minutes).toBe(120);
    expect(current[0].progress).toBeCloseTo(40 / 120);
    expect(current[0].remainingMs).toBe(80 * MIN);
    expect(current[0].height).toBe(80);
    const fiveMin = gaps(items).find((g) => g.minutes === 5);
    expect(fiveMin?.height).toBe(23);
    expect(fiveMin?.current).toBe(false);
  });

  it('keeps a current gap tall enough for its countdown', () => {
    const items = build(at(7, '18:45'));
    const current = gaps(items).find((g) => g.current);
    expect(current?.minutes).toBe(20);
    expect(current?.height).toBe(PLAN_LAYOUT.currentGapMin);
  });

  describe('day-start break', () => {
    it('opens today\'s list from 08:00 until the first Must-see', () => {
      const items = build(at(7, '11:00'));
      expect(shape(items).slice(0, 3)).toEqual(['title', 'gap:360*^', 'must:Hooded Menace']);
      const opening = items[1] as PlanGapItem;
      expect(opening.progress).toBeCloseTo(0.5);
      expect(opening.remainingMs).toBe(180 * MIN);
      expect(opening.height).toBe(160);
    });

    it('is not there before 08:00', () => {
      expect(shape(build(at(7, '07:00'))).slice(0, 3)).toEqual(['title', 'cap:start', 'must:Hooded Menace']);
    });

    it('is not there once the first Must-see has started', () => {
      expect(gaps(build(at(7, '14:10'))).some((g) => g.opening)).toBe(false);
    });

    it('is only on today', () => {
      expect(shape(build(at(7, '11:00'), { dayStart: FRI }))).toEqual(['title', 'cap:start', 'must:Spectral Wound', 'cap:end']);
    });

    it('is not there on a day without a Must-see', () => {
      const { inputs: maybeOnly, interests: maybeInterests } = inputsOf([
        ['1', 'Only maybe', 's1', at(7, '14:00'), at(7, '15:00'), 'maybe'],
      ]);
      const items = buildPlanDay(maybeInterests, maybeOnly, { dayStart: THU, now: at(7, '11:00'), duringFestival: true, showMaybe: true, conflictsOnly: false });
      expect(shape(items)).toEqual(['title', 'cap:start', 'maybe:Only maybe', 'cap:end']);
    });
  });

  describe('conflicts only', () => {
    it('keeps just the clashing Must-sees, with room for the group title', () => {
      expect(shape(build(at(7, '19:23'), { conflictsOnly: true }))).toEqual([
        'title',
        'spacer',
        'must:Gojira',
        'must:Batushka',
      ]);
    });

    it('ignores the Maybe switch and drops the day-start break', () => {
      expect(shape(build(at(7, '11:00'), { conflictsOnly: true, showMaybe: true }))).toEqual([
        'title',
        'spacer',
        'must:Gojira',
        'must:Batushka',
      ]);
    });

    it('shows the empty state on a day without clashes', () => {
      expect(shape(build(at(7, '11:00'), { conflictsOnly: true, dayStart: FRI }))).toEqual(['title', 'empty']);
    });
  });

  it('reserves room for the group title when a clash group has no gap above it', () => {
    const { inputs: b2b, interests: b2bInterests } = inputsOf([
      ['1', 'A', 's1', at(9, '17:00'), at(9, '18:00'), 'will_go'],
      ['2', 'B', 's2', at(9, '18:00'), at(9, '18:45'), 'will_go'],
      ['3', 'C', 's3', at(9, '18:30'), at(9, '19:00'), 'will_go'],
      ['4', 'D', 's1', at(10, '12:00'), at(10, '13:00'), 'will_go'],
      ['5', 'E', 's2', at(10, '12:30'), at(10, '13:30'), 'will_go'],
    ]);
    const opts = { now: at(9, '10:00'), duringFestival: true, showMaybe: false, conflictsOnly: false };
    // Back to back with the set above.
    expect(shape(buildPlanDay(b2bInterests, b2b, { ...opts, dayStart: SAT }).filter((i) => !(i.kind === 'gap' && i.opening))))
      .toEqual(['title', 'must:A', 'spacer', 'must:B', 'must:C', 'cap:end']);
    // Right under the start cap, which gives it room as a gap does.
    expect(shape(buildPlanDay(b2bInterests, b2b, { ...opts, dayStart: SUN })))
      .toEqual(['title', 'cap:start', 'must:D', 'must:E', 'cap:end']);
  });

  it('shows the empty state for a day with nothing planned', () => {
    expect(shape(build(at(7, '12:00'), { dayStart: SAT }))).toEqual(['title', 'empty']);
  });

  describe('day caps', () => {
    it('open and close the day, each as tall as a 20 min gap', () => {
      const items = build(at(7, '19:23'));
      expect(items[1]).toMatchObject({ kind: 'cap', edge: 'start', height: gapHeight(20) });
      expect(items.at(-1)).toMatchObject({ kind: 'cap', edge: 'end', height: gapHeight(20) });
    });

    it('leave the start to the day-start break while it runs', () => {
      expect(shape(build(at(7, '11:00'))).filter((s) => s === 'cap:start')).toEqual([]);
    });

    it('are not there in conflicts-only mode or on an empty day', () => {
      expect(shape(build(at(7, '19:23'), { conflictsOnly: true })).some((s) => s.startsWith('cap:'))).toBe(false);
      expect(shape(build(at(7, '12:00'), { dayStart: SAT }))).toEqual(['title', 'empty']);
    });

    it('carries no "now" once today\'s last set has ended', () => {
      expect(nowScrollOffset(build(at(8, '02:00')), 600)).toBeNull();
    });
  });

  describe('outside the festival', () => {
    const before = at(1, '12:00');
    const after = at(12, '12:00');

    it('reads after the festival as it does before it: nothing past, live or current', () => {
      const items = build(after, { duringFestival: false, showMaybe: true });
      expect(items).toEqual(build(before, { duringFestival: false, showMaybe: true }));
      const sets = items.filter((i): i is PlanSetItem => i.kind === 'set');
      expect(sets.every((s) => s.state === 'upcoming' && s.startsInMs === null)).toBe(true);
      expect(gaps(items).some((g) => g.current || g.opening)).toBe(false);
      expect(nowScrollOffset(items, 600)).toBeNull();
    });

    it('keeps the gaps and clashes of the day', () => {
      const items = build(after, { duringFestival: false });
      expect(shape(items)).toEqual(shape(build(at(7, '19:23'))));
      expect(set(items, 'Gojira').clashBars).toEqual(set(build(at(7, '19:23')), 'Gojira').clashBars);
    });
  });
});

// ── Sets over two hours ───────────────────────────────────────────────────────
//
// My plan lists exactly the sets the conflict calculation considers: one shared
// rule (conflictUtils.isConflictEligible). Anything longer than two hours — an
// all-day exhibition, say — is out of both.

describe('sets over two hours', () => {
  const { inputs: withLong, interests: withLongInterests } = inputsOf([
    ...DAY,
    ['20', 'All-day exhibition', 's2', at(7, '12:00'), at(7, '20:00'), 'will_go'],
    ['21', 'Long maybe', 's2', at(7, '18:00'), at(7, '21:00'), 'maybe'],
    ['22', 'Exactly two hours', 's2', at(8, '14:00'), at(8, '16:00'), 'will_go'],
  ]);
  const opts = { dayStart: THU, duringFestival: true, showMaybe: true, conflictsOnly: false };

  it('are not listed, Must-see or Maybe', () => {
    const names = buildPlanDay(withLongInterests, withLong, { ...opts, now: at(7, '19:23') })
      .flatMap((i) => (i.kind === 'set' ? [i.artist.name] : []));
    expect(names).not.toContain('All-day exhibition');
    expect(names).not.toContain('Long maybe');
  });

  it('leave the gaps between the listed sets as they are', () => {
    const items = buildPlanDay(withLongInterests, withLong, { ...opts, showMaybe: false, now: at(7, '19:23') });
    expect(shape(items)).toEqual(shape(build(at(7, '19:23'))));
  });

  it('do not start the day: the day-start break counts down to the first listed set', () => {
    const items = buildPlanDay(withLongInterests, withLong, { ...opts, showMaybe: false, now: at(7, '11:00') });
    expect(shape(items).slice(0, 3)).toEqual(['title', 'gap:360*^', 'must:Hooded Menace']);
  });

  it('keep a set of exactly two hours', () => {
    const names = buildPlanDay(withLongInterests, withLong, { ...opts, dayStart: FRI, now: at(7, '19:23') })
      .flatMap((i) => (i.kind === 'set' ? [i.artist.name] : []));
    expect(names).toContain('Exactly two hours');
  });
});

// ── Positions ─────────────────────────────────────────────────────────────────

describe('itemOffsets', () => {
  it('stacks the items from the top padding, with the fixed spacing between them', () => {
    const items = build(at(7, '19:23'));
    const offsets = itemOffsets(items);
    expect(offsets[0]).toBe(PLAN_LAYOUT.paddingTop);
    for (let i = 1; i < items.length; i++) {
      expect(offsets[i]).toBe(offsets[i - 1] + items[i - 1].height + PLAN_LAYOUT.itemSpacing);
    }
  });
});

describe('nowScrollOffset', () => {
  it('puts the item that carries "now" about a third from the top', () => {
    const items = build(at(7, '19:23'));
    const gojira = items.findIndex((i) => i.kind === 'set' && i.artist.name === 'Gojira');
    expect(nowScrollOffset(items, 600)).toBe(Math.max(0, itemOffsets(items)[gojira] - 200));
  });

  it('aims at the current gap when nothing is live', () => {
    const items = build(at(7, '21:10'));
    const gap = items.findIndex((i) => i.kind === 'gap' && i.current);
    expect(nowScrollOffset(items, 600)).toBe(Math.max(0, itemOffsets(items)[gap] - 200));
  });

  it('is null when "now" is not on the shown day', () => {
    expect(nowScrollOffset(build(at(7, '19:23'), { dayStart: FRI }), 600)).toBeNull();
  });
});

// ── Days with a clash ─────────────────────────────────────────────────────────

describe('daysWithClash', () => {
  it('lists the festival days that have a Must-see clash', () => {
    const days = daysWithClash(interests, inputs);
    expect(days.has(THU)).toBe(true);
    expect(days.has(FRI)).toBe(false);
  });
});
