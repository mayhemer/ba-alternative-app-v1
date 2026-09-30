import {
  computeConflictEntries,
  computeConflictOverlaps,
  eventsOverlap,
  type ConflictInputs,
} from './conflictUtils';
import type { DbArtist, DbEvent, DbStage } from '../types/backend';

// Real captured data, normalized through the backend's own functions — see
// scripts/gen-fixtures.ts. Assertions are relational against it rather than
// hardcoded, so refreshing the capture cannot break them.
import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import stagesFixture from '../../tests/fixtures/generated/ba2025/stages.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

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
  return Object.fromEntries(artistIds.map((id) => [id, 'must_see']));
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
    const interests = { [CLASH_A]: 'must_see', [CLASH_B]: 'maybe' };
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
