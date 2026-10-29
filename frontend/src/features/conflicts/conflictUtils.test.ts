import {
  computeConflictEntries,
  computeConflictOverlaps,
  conflictGroupOf,
  eventsOverlap,
  isConflictEligible,
  type ConflictInputs,
} from './conflictUtils';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// Real captured data, normalized through the backend's own functions — see
// scripts/gen-fixtures.ts. Assertions are relational against it rather than
// hardcoded, so refreshing the capture cannot break them.
import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import stagesFixture from '../../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T0 = Date.parse('2025-08-06T18:00:00+02:00');
const HOUR = 60 * 60 * 1000;

function event(id: string, fromH: number, toH: number): DbEvent {
  return {
    slug: 'ba2025',
    eventId: id,
    dateFrom: T0 + fromH * HOUR,
    dateTo: T0 + toH * HOUR,
    artistId: `a${id}`,
    stageId: 's1',
    categoryId: 'c1',
  };
}

// ── eventsOverlap ─────────────────────────────────────────────────────────────

describe('eventsOverlap', () => {
  it('reports an overlap when the ranges intersect', () => {
    expect(eventsOverlap(event('1', 0, 1), event('2', 0.5, 1.5))).toBe(true);
  });

  it('does not treat touching ranges as an overlap', () => {
    expect(eventsOverlap(event('1', 0, 1), event('2', 1, 2))).toBe(false);
  });

  it('ignores events longer than the conflict eligibility window', () => {
    // A set running over two hours is something like an all-day installation,
    // which should never be reported as clashing with a band.
    expect(eventsOverlap(event('1', 0, 3), event('2', 0.5, 1))).toBe(false);
  });
});


// ── Eligibility ───────────────────────────────────────────────────────────────
//
// The one rule deciding which sets the conflict calculation considers — and,
// through the same predicate, which sets My plan lists.

describe('isConflictEligible', () => {
  it('takes sets up to two hours long, the boundary included', () => {
    expect(isConflictEligible(event('1', 0, 1))).toBe(true);
    expect(isConflictEligible(event('1', 0, 2))).toBe(true);
  });

  it('leaves out anything longer', () => {
    expect(isConflictEligible(event('1', 0, 2.5))).toBe(false);
  });
});


// ── Real-data conflict computation ────────────────────────────────────────────

const ARTISTS = artistsFixture as unknown as DbArtist[];
const STAGES = stagesFixture as unknown as DbStage[];
const EVENTS = scheduleFixture as unknown as DbEvent[];

const ARTIST_EVENTS: Record<string, DbEvent[]> = {};
for (const e of EVENTS) {
  (ARTIST_EVENTS[e.artistId] ??= []).push(e);
}

const INPUTS: ConflictInputs = {
  artists: ARTISTS,
  stages: STAGES,
  artistEvents: ARTIST_EVENTS,
};

// A genuinely clashing pair, found in the real schedule rather than invented —
// so these cases exercise the same shapes the app sees.
function findClashingPair(): [string, string] {
  for (const a of EVENTS) {
    for (const b of EVENTS) {
      if (a.artistId !== b.artistId && eventsOverlap(a, b)) {
        return [a.artistId, b.artistId];
      }
    }
  }
  throw new Error('fixture has no overlapping events — cannot test conflicts');
}

const [CLASH_A, CLASH_B] = findClashingPair();

function mustSee(...artistIds: string[]): Record<string, string> {
  return Object.fromEntries(artistIds.map((id) => [id, 'will_go']));
}

describe('computeConflictEntries', () => {
  it('finds no conflicts when nothing is starred', () => {
    expect(computeConflictEntries({}, INPUTS)).toEqual([]);
  });

  it('finds no conflicts for a single starred artist', () => {
    expect(computeConflictEntries(mustSee(CLASH_A), INPUTS)).toEqual([]);
  });

  it('reports both sides of a clash', () => {
    const entries = computeConflictEntries(mustSee(CLASH_A, CLASH_B), INPUTS);

    const involved = new Set(entries.map((e) => e.event.artistId));
    expect(involved.has(CLASH_A)).toBe(true);
    expect(involved.has(CLASH_B)).toBe(true);
    expect(entries.every((e) => e.overlapCount > 0)).toBe(true);
  });

  it('ignores artists marked only maybe', () => {
    const interests = { [CLASH_A]: 'will_go', [CLASH_B]: 'maybe' };
    expect(computeConflictEntries(interests, INPUTS)).toEqual([]);
  });

  it('returns entries in start-time order', () => {
    const entries = computeConflictEntries(mustSee(CLASH_A, CLASH_B), INPUTS);
    const starts = entries.map((e) => e.event.dateFrom);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('resolves each entry\'s artist and stage from the inputs', () => {
    const entries = computeConflictEntries(mustSee(CLASH_A, CLASH_B), INPUTS);
    for (const entry of entries) {
      expect(entry.artist.artistId).toBe(entry.event.artistId);
      expect(typeof entry.stageName).toBe('string');
    }
  });

  it('reads nothing but its arguments', () => {
    // Purity is what lets callers memoise on real data instead of a change
    // counter — the omission that left the timeline's conflict bars stale.
    const empty: ConflictInputs = { artists: [], stages: [], artistEvents: {} };
    expect(computeConflictEntries(mustSee(CLASH_A, CLASH_B), empty)).toEqual([]);
  });
});

// ── conflictGroupOf ───────────────────────────────────────────────────────────

describe('conflictGroupOf', () => {
  // 1 ─ 2 ─ 3 chain: 3 overlaps 2 but not 1. 4 ─ 5 is a separate clash later.
  const specs: [string, number, number][] = [
    ['1', 0, 1], ['2', 0.5, 1.5], ['3', 1.25, 2], ['4', 3, 4], ['5', 3.5, 4.5], ['6', 5, 6],
  ];
  const artists = specs.map(([id]) => ({ artistId: `a${id}`, name: `A${id}` } as DbArtist));
  const artistEvents = Object.fromEntries(specs.map(([id, from, to]) => [`a${id}`, [event(id, from, to)]]));
  const entries = computeConflictEntries(
    Object.fromEntries(specs.map(([id]) => [`a${id}`, 'will_go'])),
    { artists, stages: [], artistEvents },
  );
  const ids = (events: DbEvent[]): string[] => events.map((e) => e.eventId);

  it('returns the whole chained group, even sets that miss the first one', () => {
    expect(ids(conflictGroupOf(entries, '1'))).toEqual(['1', '2', '3']);
    expect(ids(conflictGroupOf(entries, '3'))).toEqual(['1', '2', '3']);
  });

  it('keeps separate clashes apart', () => {
    expect(ids(conflictGroupOf(entries, '5'))).toEqual(['4', '5']);
  });

  it('is empty for a set that clashes with nothing', () => {
    expect(conflictGroupOf(entries, '6')).toEqual([]);
  });
});

// ── Sets over two hours in the full calculation ──────────────────────────────
//
// The eligibility rule applied by the pairing itself, not just by eventsOverlap:
// a long set the user starred clashes with nothing, and the sets it covers clash
// only with each other.

describe('sets over two hours', () => {
  // 1: all-day exhibition (8 h) over everything. 2 and 3 clash with each other.
  // 4 sits under the exhibition alone. Artist 5 has a long set and a short one
  // that clashes with 3.
  const specs: [string, string, number, number][] = [
    ['1', 'a1', 0, 8], ['2', 'a2', 1, 2], ['3', 'a3', 1.5, 2.5], ['4', 'a4', 5, 6],
    ['5', 'a5', 0, 3], ['6', 'a5', 2.25, 3],
  ];
  const artists = ['a1', 'a2', 'a3', 'a4', 'a5'].map((artistId) => ({ artistId, name: artistId } as DbArtist));
  const artistEvents: Record<string, DbEvent[]> = {};
  for (const [id, artistId, from, to] of specs) {
    (artistEvents[artistId] ??= []).push({ ...event(id, from, to), artistId });
  }
  const inputs: ConflictInputs = { artists, stages: [], artistEvents };
  const interests = mustSee('a1', 'a2', 'a3', 'a4', 'a5');

  it('never take part in a conflict, even when starred', () => {
    const entries = computeConflictEntries(interests, inputs);
    expect(entries.map((e) => e.event.eventId)).toEqual(['2', '3', '6']);
    for (const entry of entries) {
      expect(entry.overlappingEvents.map((e) => e.eventId)).not.toContain('1');
      expect(entry.overlappingEvents.map((e) => e.eventId)).not.toContain('5');
    }
  });

  it('leave the clashes between the sets they cover as they are', () => {
    const byId = new Map(computeConflictEntries(interests, inputs).map((e) => [e.event.eventId, e]));
    expect(byId.get('2')?.overlappingEvents.map((e) => e.eventId)).toEqual(['3']);
    expect(byId.get('3')?.overlappingEvents.map((e) => e.eventId).sort()).toEqual(['2', '6']);
    expect(byId.get('6')?.overlappingEvents.map((e) => e.eventId)).toEqual(['3']);
    expect(byId.get('2')?.leader).toBe(true);
    expect(byId.get('3')?.leader).toBe(false);
  });

  it('get no overlap bars, and add none to the sets they cover', () => {
    const overlaps = computeConflictOverlaps(interests, inputs);
    expect([...overlaps.keys()].sort()).toEqual(['2', '3', '6']);
    expect(overlaps.get('2')).toEqual([{ from: T0 + 1.5 * HOUR, to: T0 + 2 * HOUR }]);
  });
});

describe('computeConflictOverlaps', () => {
  it('is empty when there are no conflicts', () => {
    expect(computeConflictOverlaps({}, INPUTS).size).toBe(0);
  });

  it('gives every conflicting event at least one interval', () => {
    const overlaps = computeConflictOverlaps(mustSee(CLASH_A, CLASH_B), INPUTS);
    expect(overlaps.size).toBeGreaterThan(0);
    for (const intervals of overlaps.values()) {
      expect(intervals.length).toBeGreaterThan(0);
      for (const { from, to } of intervals) {
        expect(to).toBeGreaterThan(from);
      }
    }
  });

  it('keeps each event\'s intervals disjoint and ordered', () => {
    const overlaps = computeConflictOverlaps(mustSee(CLASH_A, CLASH_B), INPUTS);
    for (const intervals of overlaps.values()) {
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i].from).toBeGreaterThan(intervals[i - 1].to);
      }
    }
  });

  it('confines every interval to the event it belongs to', () => {
    const overlaps = computeConflictOverlaps(mustSee(CLASH_A, CLASH_B), INPUTS);
    const byId = new Map(EVENTS.map((e) => [e.eventId, e]));
    for (const [eventId, intervals] of overlaps) {
      const event = byId.get(eventId)!;
      for (const { from, to } of intervals) {
        expect(from).toBeGreaterThanOrEqual(event.dateFrom);
        expect(to).toBeLessThanOrEqual(event.dateTo);
      }
    }
  });
});
