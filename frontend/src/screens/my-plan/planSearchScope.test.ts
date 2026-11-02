import { planSearchScope, type PlanSearchInputs } from './planSearchScope';
import { placeResult } from '../../features/search/searchScope';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── What My plan tells search ─────────────────────────────────────────────────
//
// Dimensions: the filter it is on (Only conflicts … All sets); a set's level on
// the plan (Must-see, clashing or not; Maybe; an unpicked band) or none at all
// (an unpicked support set, a "don't go", a set over 2 h: not in planPicks); an
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
    expect(scope.views[1].tag).toBe('Filter → Must-see and Maybe');
    expect(placeResult(scope, ref('band'))).toEqual({ section: 'here', view: 2 });
    expect(scope.views[2].tag).toBe('Filter → All sets');
  });

  it('steps out of Only conflicts to Must-see only for a Must-see that does not clash', () => {
    const scope = planSearchScope(inputs({ level: 'conflicts' }));
    expect(placeResult(scope, ref('clash'))).toEqual({ section: 'here', view: 0 });
    expect(placeResult(scope, ref('must'))).toEqual({ section: 'here', view: 1 });
    expect(scope.views[1].tag).toBe('Filter → Must-see only');
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
