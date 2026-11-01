import { mustSeeSets, planPicks } from './plan';
import type { ConflictInputs } from './conflictUtils';
import type { DbArtist, DbEvent } from '../types/backend';

// ── The sets a pick puts on the plan ──────────────────────────────────────────
//
// One rule for the conflicts, My plan and the now pill: a pick's sets that can
// clash at all (two hours or shorter). The dimensions: each status (Must-see,
// Maybe, none, don't go), a band vs a support-programme artist (unpicked ones
// are listed only for bands), a set too long to clash, and the order (the
// lineup's for the Must-sees, by start for the plan).

const SLUG = 'plantest';
const at = (hm: string): number => Date.parse(`2025-08-07T${hm}:00+02:00`);

function artist(artistId: string, isPlayable = true): DbArtist {
  return { slug: SLUG, artistId, name: artistId, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

// The lineup's order: must, maybe, nope, band, support, late.
// "must" has a late set listed before an early one, and an all-day one.
const INPUTS: ConflictInputs = {
  artists: [artist('must'), artist('maybe'), artist('nope'), artist('band'), artist('support', false), artist('late')],
  stages: [],
  artistEvents: {
    must: [set('must-late', 'must', '20:00', '21:00'), set('must-early', 'must', '13:00', '14:00'), set('must-allday', 'must', '10:00', '18:00')],
    maybe: [set('maybe-1', 'maybe', '15:00', '16:00')],
    nope: [set('nope-1', 'nope', '12:00', '13:00')],
    band: [set('band-1', 'band', '11:00', '12:00')],
    support: [set('support-1', 'support', '09:00', '10:00')],
    late: [set('late-1', 'late', '12:30', '13:30')],
  },
};
const INTERESTS = { must: 'will_go', maybe: 'maybe', nope: 'dont_go', late: 'will_go' };

describe('mustSeeSets', () => {
  it("lists the Must-sees' sets that can clash, in the lineup's order", () => {
    expect(mustSeeSets(INTERESTS, INPUTS).map((s) => s.event.eventId)).toEqual(['must-late', 'must-early', 'late-1']);
  });
});

describe('planPicks', () => {
  it('lists the Must-sees and Maybes by start, never a "don\'t go", never a set too long to clash', () => {
    expect(planPicks(INTERESTS, INPUTS, false).map((s) => [s.event.eventId, s.level])).toEqual([
      ['late-1', 'will_go'],
      ['must-early', 'will_go'],
      ['maybe-1', 'maybe'],
      ['must-late', 'will_go'],
    ]);
  });

  it('adds the bands you have not picked when asked, never an unpicked support-programme artist', () => {
    expect(planPicks(INTERESTS, INPUTS, true).map((s) => [s.event.eventId, s.level])).toEqual([
      ['band-1', 'none'],
      ['late-1', 'will_go'],
      ['must-early', 'will_go'],
      ['maybe-1', 'maybe'],
      ['must-late', 'will_go'],
    ]);
  });
});
