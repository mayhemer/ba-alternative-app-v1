import { timelineSearchScope, type TimelineSearchInputs } from './timelineSearchScope';
import { placeResult } from '../../features/search/searchScope';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── What a timeline tells search ──────────────────────────────────────────────
//
// Dimensions: the timeline (Program / Support Program); a band vs a support
// set; the lens (Everything, My picks, a friend's) and the picks (mine: none,
// Maybe, don't go; the friend's); a hidden lane; an artist with no set. And
// what a landing widens first.

const SLUG = 'tlscopetest';

function artist(artistId: string, isPlayable: boolean): DbArtist {
  return { slug: SLUG, artistId, name: artistId, isPlayable, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, categoryId: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId, dateFrom: 0, dateTo: 1 };
}

const band = artist('band', true);
const nope = artist('nope', true);
const support = artist('support', false);
const bandSet = { artist: band, event: set('b1', 'band', 'marshall') };
const nopeSet = { artist: nope, event: set('n1', 'nope', 'marshall') };
const supportSet = { artist: support, event: set('s1', 'support', 'cinema') };

function inputs(over: Partial<TimelineSearchInputs> = {}): TimelineSearchInputs {
  return {
    support: false,
    lens: { kind: 'all' },
    interests: { nope: 'dont_go', band: 'maybe' },
    friendInterests: undefined,
    hidden: new Set(),
    setLens: jest.fn(),
    showLane: jest.fn(),
    jump: jest.fn(),
    ...over,
  };
}

describe('timelineSearchScope', () => {
  it('names its own section after the timeline, and opens the other there', () => {
    expect([timelineSearchScope(inputs()).title, timelineSearchScope(inputs({ support: true })).title]).toEqual(['Program', 'Support Program']);
    expect([timelineSearchScope(inputs()).hereOpens, timelineSearchScope(inputs()).elsewhereOpens]).toEqual(['land', 'switch']);
  });

  it('contains its own side\'s sets only, artists with no set included', () => {
    const program = timelineSearchScope(inputs());
    const supportScope = timelineSearchScope(inputs({ support: true }));
    expect(placeResult(program, bandSet)).toEqual({ section: 'here', view: 0 });
    expect(placeResult(program, supportSet)).toEqual({ section: 'support' });
    expect(placeResult(supportScope, supportSet)).toEqual({ section: 'here', view: 0 });
    expect(placeResult(supportScope, bandSet)).toEqual({ section: 'program' });
    expect(placeResult(program, { artist: band, event: null })).toEqual({ section: 'here', view: 0 });
  });

  it('shows my "don\'t go" as it is under Everything, and through the lens under My picks', () => {
    expect(placeResult(timelineSearchScope(inputs()), nopeSet)).toEqual({ section: 'here', view: 0 });
    const mine = timelineSearchScope(inputs({ lens: { kind: 'me', level: null } }));
    const placed = placeResult(mine, nopeSet);
    expect(placed).toEqual({ section: 'here', view: 2 });
    expect(mine.views[2].tag).toBe('Lens → Everything');
  });

  it('shows a set I haven\'t picked through the lens under My picks, my pick as it is', () => {
    const mine = timelineSearchScope(inputs({ lens: { kind: 'me', level: null }, interests: { band: 'maybe' } }));
    expect(placeResult(mine, bandSet)).toEqual({ section: 'here', view: 0 });
    expect(placeResult(mine, nopeSet)).toEqual({ section: 'here', view: 2 });
  });

  it('shows a set the friend hasn\'t picked through the lens under theirs, whatever my pick', () => {
    const theirs = timelineSearchScope(inputs({ lens: { kind: 'friend', token: 'f', level: null }, friendInterests: { nope: 'will_go' } }));
    expect(placeResult(theirs, nopeSet)).toEqual({ section: 'here', view: 0 });
    expect(placeResult(theirs, bandSet)).toEqual({ section: 'here', view: 2 });
  });

  it('shows a set in a hidden lane by showing the lane', () => {
    const scope = timelineSearchScope(inputs({ hidden: new Set(['marshall']) }));
    expect(placeResult(scope, bandSet)).toEqual({ section: 'here', view: 1 });
    expect(scope.views[1].tag).toBe('Shows its lane');
  });

  it('widens what the view needs, then jumps', () => {
    const run = inputs({ lens: { kind: 'me', level: null }, hidden: new Set(['marshall']) });
    timelineSearchScope(run).reveal(nopeSet, 2);
    expect(run.showLane).toHaveBeenCalledWith('marshall');
    expect(run.setLens).toHaveBeenCalledWith({ kind: 'all' });
    expect(run.jump).toHaveBeenCalledWith(nopeSet.event, { support: false, day: expect.any(Number) });
  });

  it('lands on its own view without widening anything', () => {
    const run = inputs();
    timelineSearchScope(run).reveal(bandSet, 0);
    expect([run.showLane, run.setLens].map((f) => (f as jest.Mock).mock.calls.length)).toEqual([0, 0]);
    expect(run.jump).toHaveBeenCalledTimes(1);
  });

  it('switches to the other timeline with what it needs there widened', () => {
    const run = inputs({ support: true, lens: { kind: 'me', level: null }, hidden: new Set(['marshall']) });
    timelineSearchScope(run).openElsewhere(nopeSet);
    expect(run.showLane).toHaveBeenCalledWith('marshall');
    expect(run.setLens).toHaveBeenCalledWith({ kind: 'all' });
    expect(run.jump).toHaveBeenCalledWith(nopeSet.event, { support: false, day: expect.any(Number) });
  });
});
