import {
  buildPlanDay,
  daysWithClash,
  defaultPlanDay,
  itemAtOffset,
  itemOffsets,
  itemsToFill,
  nowScrollOffset,
  planNowInView,
  planNowView,
  PLAN_LAYOUT,
  type PlanInputs,
  type PlanItem,
} from './planUtils';
import { gapHeight } from './PlanGap.model';
import type { PlanGapModel } from './PlanGap.model';
import type { PlanSetModel, SetStatus } from './PlanSetRow.model';
import { getFestivalDayStart } from '../../utils/festivalTime';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── My plan: what one day lists ───────────────────────────────────────────────
//
// buildPlanDay decides which elements a day lists and in what order; each
// element's own model (screens/my-plan/*.model.ts, tested next to it) decides
// its size and texts. These cases check the whole list.
//
// Dimensions, and the corner cases tested for each:
//   filters  — Maybe picks shown / hidden; only conflicts on / off
//   data     — Must-sees only; a Maybe between Must-sees; a Maybe overlapping a
//              Must-see; a Maybe ending after a clash group (shortens the gap
//              after it); a Maybe before the first Must-see; a day of Maybes
//              only; a clash group under a gap, back to back with the set above
//              (no gap), and right under the start cap; sets over 2 h and of
//              exactly 2 h; a set after midnight; unpicked and "don't go" sets;
//              an empty day
//   time     — another day (future, past); today before 08:00; in the
//              day-start break; exactly at a set's start; exactly at a set's
//              end; mid-set; two clashing sets live; in a gap; after the last set
//   festival — a festival day; before the festival; after it
//
// Each expected list is written out by hand from the fixture times. Read a line
// as: element, name, ⚠ when it heads a clash group, its state, and in quotes the
// text it shows. "gap now" is the gap "now" falls in; "to Maybe" marks its
// countdown to a Maybe, drawn in a dashed box. "cap end now" is the end cap
// carrying the now arrow, after the last listed set.

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// Thursday 7 Aug 2025 is "today" unless a case says otherwise. Its festival day
// runs 06:00 Thu → 06:00 Fri, so the 00:30 Wolves set still belongs to Thursday.

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

/** Thursday's Must-sees with a clash group, Maybes between them, and Friday's one set. */
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

/** A Maybe before the day's first Must-see. */
const EARLY: Spec[] = [
  ['1', 'Early maybe', 's1', at(7, '12:00'), at(7, '12:40'), 'maybe'],
  ['2', 'First must', 's2', at(7, '14:00'), at(7, '14:40'), 'will_go'],
];

/** A day of Maybe picks only. */
const MAYBE_ONLY: Spec[] = [
  ['1', 'Only maybe', 's1', at(7, '14:00'), at(7, '15:00'), 'maybe'],
];

/** Saturday: a clash group back to back with the set above. Sunday: one right under the start cap. */
const B2B: Spec[] = [
  ['1', 'A', 's1', at(9, '17:00'), at(9, '18:00'), 'will_go'],
  ['2', 'B', 's2', at(9, '18:00'), at(9, '18:45'), 'will_go'],
  ['3', 'C', 's3', at(9, '18:30'), at(9, '19:00'), 'will_go'],
  ['4', 'D', 's1', at(10, '12:00'), at(10, '13:00'), 'will_go'],
  ['5', 'E', 's2', at(10, '12:30'), at(10, '13:30'), 'will_go'],
];

/** The day plus sets over 2 h (never listed), one of exactly 2 h, and an early Maybe. */
const LONG: Spec[] = [
  ...DAY,
  ['20', 'All-day exhibition', 's2', at(7, '12:00'), at(7, '20:00'), 'will_go'],
  ['21', 'Long maybe', 's2', at(7, '18:00'), at(7, '21:00'), 'maybe'],
  ['22', 'Exactly two hours', 's2', at(8, '14:00'), at(8, '16:00'), 'will_go'],
  ['23', 'Early maybe', 's3', at(7, '13:00'), at(7, '13:40'), 'maybe'],
];

type Options = { day: number; now: number; maybe: boolean; conflictsOnly: boolean; festival: boolean };

const TODAY: Options = { day: THU, now: at(7, '12:00'), maybe: false, conflictsOnly: false, festival: true };

function build(data: Spec[], opts: Partial<Options>): PlanItem[] {
  const { day, now, maybe, conflictsOnly, festival } = { ...TODAY, ...opts };
  const { inputs, interests } = inputsOf(data);
  return buildPlanDay(interests, inputs, { dayStart: day, now, duringFestival: festival, showMaybe: maybe, conflictsOnly });
}

function statusText(status: SetStatus): string {
  switch (status.kind) {
    case 'live':
    case 'start':
      return ` "${status.label} ${status.time}"`;
    case 'done':
      return ` "${status.label}"`;
    default:
      return '';
  }
}

/** Each item as one readable line; see the header for how to read it. */
function shape(items: PlanItem[]): string[] {
  return items.map((item) => {
    switch (item.kind) {
      case 'cap': return `cap ${item.edge}${item.nowY !== null ? ' now' : ''}`;
      case 'spacer': return 'spacer';
      case 'empty': return `empty "${item.text}"`;
      case 'gap': return `gap${item.current ? ' now' : ''} "${item.label}"${item.opening ? ' opening' : ''}${item.countdownToMaybe ? ' to Maybe' : ''}`;
      case 'set': {
        const level = item.level === 'will_go' ? 'must' : 'maybe';
        return `${level} ${item.artist.name}${item.conflictHead ? ' ⚠' : ''} — ${item.state}${statusText(item.status)}`;
      }
      // Anything else the list should not hold shows up by its kind.
      default: return (item as { kind: string }).kind;
    }
  });
}

function set(items: PlanItem[], name: string): PlanSetModel {
  const found = items.find((i): i is PlanSetModel => i.kind === 'set' && i.artist.name === name);
  if (found === undefined) {
    throw new Error(`no set for ${name}`);
  }
  return found;
}

// ── Recurring stretches of the expected lists ─────────────────────────────────

/** Thursday's Must-sees, all ahead. */
const MUSTS_AHEAD = [
  'must Hooded Menace — upcoming',
  'gap "2 h 25"',
  'must Dark Funeral — upcoming',
  'gap "5 min"',
  'must Mgła — upcoming',
  'gap "20 min"',
  'must Gojira ⚠ — upcoming',
  'must Batushka — upcoming',
  'gap "2 h"',
  'must Emperor — upcoming',
  'gap "45 min"',
  'must Wolves in the Throne Room — upcoming',
];

/** Thursday's Must-sees, all played. */
const MUSTS_DONE = [
  'must Hooded Menace — past "done"',
  'gap "2 h 25"',
  'must Dark Funeral — past "done"',
  'gap "5 min"',
  'must Mgła — past "done"',
  'gap "20 min"',
  'must Gojira ⚠ — past "done"',
  'must Batushka — past "done"',
  'gap "2 h"',
  'must Emperor — past "done"',
  'gap "45 min"',
  'must Wolves in the Throne Room — past "done"',
];

/** Thursday with Maybes shown, all ahead. */
const WITH_MAYBES_AHEAD = [
  'must Hooded Menace — upcoming',
  'gap "50 min"',
  'maybe Blood Incantation — upcoming',
  'gap "50 min"',
  'must Dark Funeral — upcoming',
  'gap "5 min"',
  'must Mgła — upcoming',
  'gap "20 min"',
  'must Gojira ⚠ — upcoming',
  'must Batushka — upcoming',
  "maybe Paysage d'Hiver — upcoming",
  'gap "1 h 30"',
  'must Emperor — upcoming',
  'gap "45 min"',
  'must Wolves in the Throne Room — upcoming',
];

/** Thursday with Maybes shown, played up to Mgła. */
const WITH_MAYBES_TO_MGLA_DONE = [
  'must Hooded Menace — past "done"',
  'gap "50 min"',
  'maybe Blood Incantation — past',
  'gap "50 min"',
  'must Dark Funeral — past "done"',
  'gap "5 min"',
  'must Mgła — past "done"',
  'gap "20 min"',
];

// ── Corner cases ──────────────────────────────────────────────────────────────

const CASES: [name: string, data: Spec[], opts: Partial<Options>, expected: string[]][] = [
  // Time through today, Maybes hidden
  ['today before 08:00: the start cap, everything ahead', DAY, { now: at(7, '07:00') }, [
    'cap start', ...MUSTS_AHEAD, 'cap end',
  ]],
  ['in the day-start break: it opens the list instead of the start cap', DAY, { now: at(7, '11:00') }, [
    'gap now "−3 h" opening', ...MUSTS_AHEAD, 'cap end',
  ]],
  ['exactly at the first set\'s start: live, no break any more', DAY, { now: at(7, '14:00') }, [
    'cap start', 'must Hooded Menace — live "LIVE −40 min"', ...MUSTS_AHEAD.slice(1), 'cap end',
  ]],
  ['exactly at a set\'s end: done, the gap after it current and whole', DAY, { now: at(7, '14:40') }, [
    'cap start', 'must Hooded Menace — past "done"', 'gap now "−2 h 25"', ...MUSTS_AHEAD.slice(2), 'cap end',
  ]],
  ['mid-set, with a clashing set about to start', DAY, { now: at(7, '19:23') }, [
    'cap start',
    ...MUSTS_DONE.slice(0, 6),
    'must Gojira ⚠ — live "LIVE −37 min"',
    'must Batushka — upcoming "START −17 min"',
    ...MUSTS_AHEAD.slice(8),
    'cap end',
  ]],
  ['two clashing sets both live', DAY, { now: at(7, '19:52') }, [
    'cap start',
    ...MUSTS_DONE.slice(0, 6),
    'must Gojira ⚠ — live "LIVE −8 min"',
    'must Batushka — live "LIVE −38 min"',
    ...MUSTS_AHEAD.slice(8),
    'cap end',
  ]],
  ['in a gap: it counts down to the set under it', DAY, { now: at(7, '21:10') }, [
    'cap start',
    ...MUSTS_DONE.slice(0, 8),
    'gap now "−1 h 20"',
    ...MUSTS_AHEAD.slice(9),
    'cap end',
  ]],
  ['the minute the last set ends: the end cap takes the arrow', DAY, { now: at(8, '01:30') }, [
    'cap start', ...MUSTS_DONE, 'cap end now',
  ]],
  ['after the last set, before the 06:00 day change: the end cap keeps the arrow', DAY, { now: at(8, '05:59') }, [
    'cap start', ...MUSTS_DONE, 'cap end now',
  ]],
  ['at the 06:00 day change: the day is past, the end cap without the arrow', DAY, { now: at(8, '06:00') }, [
    'cap start', ...MUSTS_DONE, 'cap end',
  ]],

  // Maybes shown
  ['Maybes shown: they split the gaps, and never clash or count down', DAY, { now: at(7, '19:23'), maybe: true }, [
    'cap start',
    ...WITH_MAYBES_TO_MGLA_DONE,
    'must Gojira ⚠ — live "LIVE −37 min"',
    'must Batushka — upcoming "START −17 min"',
    "maybe Paysage d'Hiver — upcoming",
    ...WITH_MAYBES_AHEAD.slice(11),
    'cap end',
  ]],
  ['Maybes shown: a gap ending at a Maybe counts down to it, marked as a countdown to a Maybe', DAY, { now: at(7, '15:00'), maybe: true }, [
    'cap start',
    'must Hooded Menace — past "done"',
    'gap now "−30 min" to Maybe',
    'maybe Blood Incantation — upcoming',
    ...WITH_MAYBES_AHEAD.slice(3),
    'cap end',
  ]],
  ['Maybes shown: a Maybe overlapping a live Must-see is live too, with no status', DAY, { now: at(7, '20:20'), maybe: true }, [
    'cap start',
    ...WITH_MAYBES_TO_MGLA_DONE,
    'must Gojira ⚠ — past "done"',
    'must Batushka — live "LIVE −10 min"',
    "maybe Paysage d'Hiver — live",
    ...WITH_MAYBES_AHEAD.slice(11),
    'cap end',
  ]],
  ['Maybes shown: a Maybe ending after a clash group starts the gap after it', DAY, { now: at(7, '21:10'), maybe: true }, [
    'cap start',
    ...WITH_MAYBES_TO_MGLA_DONE,
    'must Gojira ⚠ — past "done"',
    'must Batushka — past "done"',
    "maybe Paysage d'Hiver — past",
    'gap now "−1 h 20"',
    ...WITH_MAYBES_AHEAD.slice(12),
    'cap end',
  ]],

  // A Maybe before the first Must-see
  ['Maybes shown: the day-start break ends at the Maybe', EARLY, { now: at(7, '11:00'), maybe: true }, [
    'gap now "−1 h" opening to Maybe', 'maybe Early maybe — upcoming', 'gap "1 h 20"', 'must First must — upcoming', 'cap end',
  ]],
  ['Maybes hidden: the day-start break ends at the first Must-see', EARLY, { now: at(7, '11:00') }, [
    'gap now "−3 h" opening', 'must First must — upcoming', 'cap end',
  ]],
  ['Maybes shown, the early Maybe live: no break any more', EARLY, { now: at(7, '12:10'), maybe: true }, [
    'cap start', 'maybe Early maybe — live', 'gap "1 h 20"', 'must First must — upcoming', 'cap end',
  ]],
  ['Maybes shown, after the early Maybe: the gap to the Must-see is current', EARLY, { now: at(7, '13:00'), maybe: true }, [
    'cap start', 'maybe Early maybe — past', 'gap now "−1 h"', 'must First must — upcoming', 'cap end',
  ]],

  // A day of Maybes only
  ['only Maybes, shown: listed, but no day-start break without a Must-see', MAYBE_ONLY, { now: at(7, '11:00'), maybe: true }, [
    'cap start', 'maybe Only maybe — upcoming', 'cap end',
  ]],
  ['only Maybes, hidden: an empty day', MAYBE_ONLY, { now: at(7, '11:00') }, [
    'empty "Nothing planned for this day"',
  ]],
  ['only Maybes, shown, after the last one: the end cap takes the arrow without a Must-see', MAYBE_ONLY, { now: at(7, '16:00'), maybe: true }, [
    'cap start', 'maybe Only maybe — past', 'cap end now',
  ]],

  // Only conflicts
  ['only conflicts: just the clashing Must-sees, with room for the group title', DAY, { now: at(7, '19:23'), conflictsOnly: true }, [
    'spacer', 'must Gojira ⚠ — live "LIVE −37 min"', 'must Batushka — upcoming "START −17 min"',
  ]],
  ['only conflicts: no Maybes and no day-start break, whatever the Maybe switch', DAY, { now: at(7, '11:00'), conflictsOnly: true, maybe: true }, [
    'spacer', 'must Gojira ⚠ — upcoming', 'must Batushka — upcoming',
  ]],
  ['only conflicts, after the last set: no end cap, so no arrow', DAY, { now: at(8, '02:00'), conflictsOnly: true }, [
    'spacer', 'must Gojira ⚠ — past "done"', 'must Batushka — past "done"',
  ]],
  ['only conflicts, on a day without a clash', DAY, { day: FRI, now: at(7, '11:00'), conflictsOnly: true }, [
    'empty "No conflicts on this day"',
  ]],

  // Where a clash group sits
  ['a clash group back to back with the set above: a spacer gives its title room', B2B, { day: SAT, now: at(9, '10:00') }, [
    'gap now "−7 h" opening', 'must A — upcoming', 'spacer', 'must B ⚠ — upcoming', 'must C — upcoming', 'cap end',
  ]],
  ['a clash group right under the start cap: the cap gives its title room', B2B, { day: SUN, now: at(9, '10:00') }, [
    'cap start', 'must D ⚠ — upcoming', 'must E — upcoming', 'cap end',
  ]],

  // Sets over two hours
  ['sets over 2 h: not listed, and the gaps and clashes stay as they are', LONG, { now: at(7, '19:23'), maybe: true }, [
    'cap start',
    'maybe Early maybe — past',
    'gap "20 min"',
    ...WITH_MAYBES_TO_MGLA_DONE,
    'must Gojira ⚠ — live "LIVE −37 min"',
    'must Batushka — upcoming "START −17 min"',
    "maybe Paysage d'Hiver — upcoming",
    ...WITH_MAYBES_AHEAD.slice(11),
    'cap end',
  ]],
  ['sets over 2 h do not start the day: the break counts to the first listed set', LONG, { now: at(7, '11:00'), maybe: true }, [
    'gap now "−2 h" opening to Maybe', 'maybe Early maybe — upcoming', 'gap "20 min"', ...WITH_MAYBES_AHEAD, 'cap end',
  ]],
  ['a set of exactly 2 h is listed', LONG, { day: FRI, now: at(7, '19:23') }, [
    'cap start', 'must Spectral Wound — upcoming', 'gap "50 min"', 'must Exactly two hours — upcoming', 'cap end',
  ]],

  // Other days
  ['a future day: its own sets, nothing current', DAY, { day: FRI, now: at(7, '11:00') }, [
    'cap start', 'must Spectral Wound — upcoming', 'cap end',
  ]],
  ['a past day: everything done', DAY, { now: at(8, '14:00') }, [
    'cap start', ...MUSTS_DONE, 'cap end',
  ]],
  ['a day with nothing planned', DAY, { day: SAT, now: at(7, '12:00') }, [
    'empty "Nothing planned for this day"',
  ]],

  // Outside the festival
  ['before the festival: everything ahead, nothing current', DAY, { now: at(1, '12:00'), festival: false, maybe: true }, [
    'cap start', ...WITH_MAYBES_AHEAD, 'cap end',
  ]],
  ['after the festival: read as before it', DAY, { now: at(12, '12:00'), festival: false, maybe: true }, [
    'cap start', ...WITH_MAYBES_AHEAD, 'cap end',
  ]],
];

describe('buildPlanDay', () => {
  it.each(CASES)('%s', (_name, data, opts, expected) => {
    expect(shape(build(data, opts))).toEqual(expected);
  });

  it('sizes the day-start break by the first listed set too: length, fill and countdown alike', () => {
    const opening = build(EARLY, { now: at(7, '11:00'), maybe: true })[0] as PlanGapModel;
    expect(opening.label).toBe('−1 h');
    expect(opening.height).toBe(gapHeight(240));
    expect(opening.progress).toBeCloseTo(3 / 4);
  });

  it('places the clash bars where each Must-see overlaps another, during the festival and outside it', () => {
    const during = build(DAY, { now: at(7, '19:23') });
    const outside = build(DAY, { now: at(12, '12:00'), festival: false });
    for (const items of [during, outside]) {
      expect(set(items, 'Gojira').clashBars).toEqual([{ from: 40 / 60, to: 1 }]);
      expect(set(items, 'Batushka').clashBars).toEqual([{ from: 0, to: 20 / 50 }]);
      expect(set(items, 'Emperor').clashBars).toEqual([]);
    }
  });

  it('hands each conflict title to the cell right above its clash group: a gap, a spacer or the start cap', () => {
    const titles = (items: PlanItem[]): string[] => items.flatMap((i) => (
      (i.kind === 'gap' || i.kind === 'cap' || i.kind === 'spacer') && i.conflictTitle !== null ? [`${i.key} → ${i.conflictTitle.eventId}`] : []
    ));
    expect(titles(build(DAY, { now: at(7, '19:23') }))).toEqual(['gap-e5 → e5']);
    expect(titles(build(DAY, { now: at(7, '19:23'), conflictsOnly: true }))).toEqual(['spacer-e5 → e5']);
    expect(titles(build(B2B, { day: SAT, now: at(9, '10:00') }))).toEqual(['spacer-e2 → e2']);
    expect(titles(build(B2B, { day: SUN, now: at(9, '10:00') }))).toEqual(['cap-start → e4']);
  });

  it('reads after the festival exactly as before it', () => {
    expect(build(DAY, { now: at(12, '12:00'), festival: false, maybe: true }))
      .toEqual(build(DAY, { now: at(1, '12:00'), festival: false, maybe: true }));
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

// ── Positions ─────────────────────────────────────────────────────────────────

describe('itemOffsets', () => {
  it('stacks the items from the top padding, with the fixed spacing between them', () => {
    const items = build(DAY, { now: at(7, '19:23') });
    const offsets = itemOffsets(items);
    expect(offsets[0]).toBe(PLAN_LAYOUT.paddingTop);
    for (let i = 1; i < items.length; i++) {
      expect(offsets[i]).toBe(offsets[i - 1] + items[i - 1].height + PLAN_LAYOUT.itemSpacing);
    }
  });
});

// Friday holds one Must-see: the start cap at 12 (30 tall), Spectral Wound at
// 48 (58), the end cap at 112 (30).
const FRIDAY = (): PlanItem[] => build(DAY, { day: FRI, now: at(7, '11:00') });

describe('itemAtOffset', () => {
  it('is the item whose top is at or above the offset', () => {
    const items = FRIDAY();
    expect([0, 47, 48, 111, 112, 500].map((y) => itemAtOffset(items, y))).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe('itemsToFill', () => {
  it('counts the items a screen of that height shows from the offset down', () => {
    const items = FRIDAY();
    expect(itemsToFill(items, 0, 50)).toBe(2);
    expect(itemsToFill(items, 48, 70)).toBe(2);
    expect(itemsToFill(items, 48, 63)).toBe(1);
    expect(itemsToFill(items, 0, 1000)).toBe(3);
  });
});

describe('nowScrollOffset', () => {
  it('puts the live set about a third from the top', () => {
    const items = build(DAY, { now: at(7, '19:23') });
    const gojira = items.findIndex((i) => i.kind === 'set' && i.artist.name === 'Gojira');
    expect(nowScrollOffset(items, 600)).toBe(Math.max(0, itemOffsets(items)[gojira] - 200));
  });

  it('aims at the current gap when nothing is live', () => {
    const items = build(DAY, { now: at(7, '21:10') });
    const gap = items.findIndex((i) => i.kind === 'gap' && i.current);
    expect(nowScrollOffset(items, 600)).toBe(Math.max(0, itemOffsets(items)[gap] - 200));
  });

  it('is null when "now" is not on the shown day', () => {
    expect(nowScrollOffset(build(DAY, { day: FRI, now: at(7, '19:23') }), 600)).toBeNull();
  });

  it('aims at the end cap once today\'s last set has ended', () => {
    const items = build(DAY, { now: at(8, '02:00') });
    const cap = items.findIndex((i) => i.kind === 'cap' && i.edge === 'end');
    expect(nowScrollOffset(items, 600)).toBe(Math.max(0, itemOffsets(items)[cap] - 200));
  });

  it('is null outside the festival', () => {
    expect(nowScrollOffset(build(DAY, { now: at(12, '12:00'), festival: false }), 600)).toBeNull();
  });
});

// ── Where now is on the scrolled list ─────────────────────────────────────────
//
// What the now pill on My plan needs to decide between scrolling to now and
// switching to the timeline (planNowInView), in content y.
//
// One Must-see on Thursday, 14:00–15:00: the start cap at 12 (30 tall), the set
// at 48 (58), the end cap at 112 (30); each cell adds 6 of spacing and the list
// 24 of bottom padding, so the content is 172 tall, plus the floating bottom
// bar's clearance. A scroll to now puts the arrow's item a third of the screen
// from the top, as far as the list can scroll.
//
// Dimensions: the arrow on a live set, on the end cap after the last set, none
// (before 08:00, an empty day); a list that can or cannot scroll that far; with
// and without the floating bottom bar.

const SOLO: Spec[] = [['1', 'Solo', 's1', at(7, '14:00'), at(7, '15:00'), 'will_go']];

describe('planNowView', () => {
  it('a live set: the arrow halfway down the row', () => {
    // 48 + 58 / 2; to now: 48 − 90 / 3.
    expect(planNowView(build(SOLO, { now: at(7, '14:30') }), { scrollY: 50, viewportHeight: 90, bottomInset: 0 }))
      .toEqual({ now: 77, scroll: 50, size: 90, nowScroll: 18 });
  });

  it('after the last set: the arrow on the end cap, as far as the list scrolls', () => {
    // 112 + 30 − 10 / 2; to now would be 112 − 150 / 3 = 62, but the list ends at 172 − 150.
    expect(planNowView(build(SOLO, { now: at(7, '16:00') }), { scrollY: 0, viewportHeight: 150, bottomInset: 0 }))
      .toEqual({ now: 137, scroll: 0, size: 150, nowScroll: 22 });
  });

  it('under the floating bottom bar: the visible part ends above it, the list scrolls further', () => {
    // Visible 150 − 60; the content 172 + 60 scrolls to 82, so 62 is reachable.
    expect(planNowView(build(SOLO, { now: at(7, '16:00') }), { scrollY: 0, viewportHeight: 150, bottomInset: 60 }))
      .toEqual({ now: 137, scroll: 0, size: 90, nowScroll: 62 });
  });

  it('before 08:00: no arrow, and a scroll to now goes to the top', () => {
    expect(planNowView(build(SOLO, { now: at(7, '07:00') }), { scrollY: 40, viewportHeight: 90, bottomInset: 0 }))
      .toEqual({ now: null, scroll: 40, size: 90, nowScroll: 0 });
  });

  it('an empty day: no arrow, and a scroll to now goes to the top', () => {
    expect(planNowView(build([], { now: at(7, '14:30') }), { scrollY: 0, viewportHeight: 600, bottomInset: 0 }))
      .toEqual({ now: null, scroll: 0, size: 600, nowScroll: 0 });
  });
});

// ── Whether now is in My plan's view ──────────────────────────────────────────
//
// In content y: a view 400 tall scrolled to 1000 shows 1000–1400; its central
// 80 % is 1040–1360. Dimensions: where now is drawn (inside the band, at each
// edge, just outside, not drawn at all) × whether a scroll to now would move
// the view.

describe('planNowInView', () => {
  const view = { scroll: 1000, size: 400 };
  const far = 3000;

  it('now in the middle of the view', () => {
    expect(planNowInView({ ...view, now: 1200, nowScroll: far })).toBe(true);
  });

  it('now at the band edges, 10 % and 90 % down', () => {
    expect(planNowInView({ ...view, now: 1040, nowScroll: far })).toBe(true);
    expect(planNowInView({ ...view, now: 1360, nowScroll: far })).toBe(true);
  });

  it('now just outside the band, though still on screen', () => {
    expect(planNowInView({ ...view, now: 1039, nowScroll: far })).toBe(false);
    expect(planNowInView({ ...view, now: 1361, nowScroll: far })).toBe(false);
  });

  it('now outside the band, but a scroll to now would not move the view: it cannot get closer', () => {
    expect(planNowInView({ ...view, now: 1395, nowScroll: 1000 })).toBe(true);
    expect(planNowInView({ ...view, now: 1395, nowScroll: 1000.5 })).toBe(true);
  });

  it('now outside the band and a scroll to now would move the view', () => {
    expect(planNowInView({ ...view, now: 1395, nowScroll: 1002 })).toBe(false);
  });

  it('no now drawn: in view only where a scroll to now goes', () => {
    expect(planNowInView({ ...view, now: null, nowScroll: 1000 })).toBe(true);
    expect(planNowInView({ ...view, now: null, nowScroll: 0 })).toBe(false);
  });
});

// ── Days with a clash ─────────────────────────────────────────────────────────

describe('daysWithClash', () => {
  it('lists the festival days that have a Must-see clash', () => {
    const { inputs, interests } = inputsOf(DAY);
    const days = daysWithClash(interests, inputs);
    expect(days.has(THU)).toBe(true);
    expect(days.has(FRI)).toBe(false);
  });
});
