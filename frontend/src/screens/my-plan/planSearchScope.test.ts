import { planSearchScope, type PlanSearchInputs } from './planSearchScope';
import { placeResult } from '../../features/search/searchScope';
import type { DbArtist, DbEvent } from '../../types/backend';
import type { PlanFilterLevel } from '../../lib/plan';

// ── What My plan tells search ─────────────────────────────────────────────────
//
// Dimensions: the filter it is on (Only conflicts … All sets); a set's level on
// the plan (Must-see, clashing or not; Maybe; an unpicked or "don't go" band) or
// none at all (an unpicked or "don't go" support set, a support set over 3 h:
// not in planPicks); an
// artist with no set. And what a landing widens first.

const SLUG = 'plscopetest';

function artist(artistId: string, isPlayable: boolean): DbArtist {
  return { slug: SLUG, artistId, name: artistId, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: 0, dateTo: 1 };
}

const ref = (eventId: string, isPlayable = true) => ({ artist: artist(eventId, isPlayable), event: set(eventId, eventId) });

function inputs(over: Partial<PlanSearchInputs> = {}): PlanSearchInputs {
  return {
    level: 'must',
    listable: new Map([['clash', 'will_go'], ['must', 'will_go'], ['maybe', 'maybe'], ['band', 'none']]),
    clashing: new Set(['clash']),
    setLevel: jest.fn(),
    land: jest.fn(),
    ...over,
  };
}

describe('planSearchScope', () => {
  it('is My plan\'s own section, landing there; the rest opens details', () => {
    const scope = planSearchScope(inputs());
    expect([scope.title, scope.hereOpens, scope.elsewhereOpens]).toEqual(['My plan', 'land', 'details']);
  });

  it('lists under the current filter without widening', () => {
    expect(placeResult(planSearchScope(inputs()), ref('must'))).toEqual({ section: 'here', view: 0 });
  });

  it('widens to the first filter that lists a set, and says which', () => {
    const scope = planSearchScope(inputs());
    expect(placeResult(scope, ref('maybe'))).toEqual({ section: 'here', view: 1 });
    expect(scope.views[1].tag).toBe('Filter → All my picks');
    expect(placeResult(scope, ref('band'))).toEqual({ section: 'here', view: 2 });
    expect(scope.views[2].tag).toBe('Filter → All sets');
  });

  it('widens to All sets for a "don\'t go" band', () => {
    const scope = planSearchScope(inputs({ listable: new Map([['dontgo', 'dont_go']]) }));
    expect(placeResult(scope, ref('dontgo'))).toEqual({ section: 'here', view: 2 });
  });

  it('steps out of Only conflicts to Must-see only for a Must-see that does not clash', () => {
    const scope = planSearchScope(inputs({ level: 'conflicts' }));
    expect(placeResult(scope, ref('clash'))).toEqual({ section: 'here', view: 0 });
    expect(placeResult(scope, ref('must'))).toEqual({ section: 'here', view: 1 });
    expect(scope.views[1].tag).toBe('Filter → Only what I must see');
  });

  it('places what no filter lists by where it is', () => {
    const scope = planSearchScope(inputs({ level: 'all' }));
    expect(placeResult(scope, ref('support', false))).toEqual({ section: 'support' });
    expect(placeResult(scope, ref('dontgo'))).toEqual({ section: 'program' });
    expect(placeResult(scope, { artist: artist('later', true), event: null })).toEqual({ section: 'program' });
  });

  it('widens the filter, then lands on the set', () => {
    const run = inputs();
    planSearchScope(run).reveal(ref('band'), 2);
    expect(run.setLevel).toHaveBeenCalledWith('all');
    expect(run.land).toHaveBeenCalledWith(set('band', 'band'));
  });

  it('lands without touching the filter when it already lists the set', () => {
    const run = inputs();
    planSearchScope(run).reveal(ref('must'), 0);
    expect(run.setLevel).not.toHaveBeenCalled();
    expect(run.land).toHaveBeenCalledTimes(1);
  });
});

// Turned to landscape, My plan shows the timeline (PlanTimeline.model): a set
// only where you picked something that day in its category on its stage, your
// picks over 3 h too, and under All sets every set there, support items not
// picked included. Search places a set by what the timeline shows, as it does
// by the list.
describe('in landscape', () => {
  // The timeline's rule, by set: the filters each one shows under.
  const SHOWN: Record<string, PlanFilterLevel[]> = {
    must: ['must', 'maybe', 'all'],
    long: ['must', 'maybe', 'all'],
    band: ['all'],
    support: ['all'],
  };
  const timeline = { shows: (level: PlanFilterLevel, event: DbEvent): boolean => (SHOWN[event.eventId] ?? []).includes(level) };
  const landscape = (over: Partial<PlanSearchInputs> = {}) => planSearchScope(inputs({
    listable: new Map([['must', 'will_go'], ['band', 'none'], ['quiet', 'none']]),
    timeline,
    ...over,
  }));

  it('widens to All sets for a band not picked in a picked category on a picked stage', () => {
    expect(placeResult(landscape(), ref('band'))).toEqual({ section: 'here', view: 2 });
  });

  it('widens to All sets for a support item not picked there, which the list never shows', () => {
    expect(placeResult(landscape(), ref('support', false))).toEqual({ section: 'here', view: 2 });
    expect(placeResult(planSearchScope(inputs()), ref('support', false))).toEqual({ section: 'support' });
  });

  it('lands on a Must-see over 3 h as it is, which the list never shows', () => {
    expect(placeResult(landscape(), ref('long', false))).toEqual({ section: 'here', view: 0 });
    expect(placeResult(planSearchScope(inputs()), ref('long', false))).toEqual({ section: 'support' });
  });

  it('places a set the timeline shows under no filter by where it is', () => {
    expect(placeResult(landscape(), ref('quiet'))).toEqual({ section: 'program' });
    expect(placeResult(landscape({ level: 'all' }), ref('quiet'))).toEqual({ section: 'program' });
  });

  it('lists a Must-see as the list does', () => {
    expect(placeResult(landscape(), ref('must'))).toEqual({ section: 'here', view: 0 });
  });
});
