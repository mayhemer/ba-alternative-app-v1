import { nowPillState } from './nowPillState';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import type { PlanInputs } from './planUtils';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// The same hand-made Thursday as planUtils.test.ts, trimmed to what the pill
// reads: today's Must-sees (and one Maybe, which it must ignore).

const MIN = 60 * 1000;

function at(dayOfMonth: number, hm: string): number {
  return Date.parse(`2025-08-${String(dayOfMonth).padStart(2, '0')}T${hm}:00+02:00`);
}

const THU = getFestivalDayStart(at(7, '12:00'));
const FRI = getFestivalDayStart(at(8, '12:00'));
const DAYS = [THU, FRI];

const STAGES: DbStage[] = [{ slug: 'test', stageId: 's', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Stage' }] }];

type Spec = [id: string, name: string, from: number, to: number, status: string];

const SPECS: Spec[] = [
  ['1', 'Hooded Menace', at(7, '14:00'), at(7, '14:40'), 'will_go'],
  ['5', 'Gojira', at(7, '19:00'), at(7, '20:00'), 'will_go'],
  ['6', 'Batushka', at(7, '19:40'), at(7, '20:30'), 'will_go'],
  ['7', "Paysage d'Hiver", at(7, '20:10'), at(7, '21:00'), 'maybe'],
  ['8', 'Emperor', at(7, '22:30'), at(7, '23:45'), 'will_go'],
  ['9', 'Wolves in the Throne Room', at(8, '00:30'), at(8, '01:30'), 'will_go'],
  ['10', 'Spectral Wound', at(8, '12:30'), at(8, '13:10'), 'will_go'],
];

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

const { inputs, interests } = setup(SPECS);

function pill(now: number) {
  return nowPillState(interests, inputs, DAYS, now);
}

// ── Live ──────────────────────────────────────────────────────────────────────

describe('while a Must-see is live', () => {
  it('shows it with the time left and how far it has played', () => {
    expect(pill(at(7, '19:23'))).toEqual({
      kind: 'live',
      artistName: 'Gojira',
      remainingMs: 37 * MIN,
      progress: 23 / 60,
      more: 0,
    });
  });

  it('shows the set that ends soonest during a clash, counting the others', () => {
    expect(pill(at(7, '19:52'))).toEqual({
      kind: 'live',
      artistName: 'Gojira',
      remainingMs: 8 * MIN,
      progress: 52 / 60,
      more: 1,
    });
  });
});

// ── Break ─────────────────────────────────────────────────────────────────────

describe('between Must-sees', () => {
  it('counts down to the next one today', () => {
    expect(pill(at(7, '21:10'))).toEqual({ kind: 'break', artistName: 'Emperor', remainingMs: 80 * MIN });
  });

  it('ignores Maybe picks, live or not', () => {
    // Paysage d'Hiver (Maybe) plays 20:10–21:00; Batushka ended at 20:30.
    expect(pill(at(7, '20:40'))).toEqual({ kind: 'break', artistName: 'Emperor', remainingMs: 110 * MIN });
  });

  it('opens the day with a break from 08:00 until the first Must-see', () => {
    expect(pill(at(7, '11:00'))).toEqual({ kind: 'break', artistName: 'Hooded Menace', remainingMs: 180 * MIN });
  });
});

// ── Logo ──────────────────────────────────────────────────────────────────────

describe('falls back to the logo', () => {
  it('before 08:00', () => {
    expect(pill(at(7, '07:00'))).toEqual({ kind: 'logo' });
  });

  it('after the day\'s last Must-see, until the 06:00 day change', () => {
    expect(pill(at(8, '02:00'))).toEqual({ kind: 'logo' });
  });

  it('outside the festival', () => {
    expect(pill(at(5, '19:00'))).toEqual({ kind: 'logo' });
    expect(pill(at(12, '19:00'))).toEqual({ kind: 'logo' });
  });

  it('with no Must-see picks', () => {
    const { inputs: noPicks, interests: none } = setup(SPECS.map(([id, name, from, to]) => [id, name, from, to, 'maybe']));
    expect(nowPillState(none, noPicks, DAYS, at(7, '19:23'))).toEqual({ kind: 'logo' });
  });
});
