import { isInterested, isRemovedByLens, matchesScope } from './interestUtils';
import type { InterestStatus } from '../features/interests/InterestContext';

// ── 'dont_go' is a decision against an artist ────────────────────────────────
//
// Only the star button shows it; for everything that asks "is this a pick?" it
// is the same as 'none'.

const ALL: InterestStatus[] = ['none', 'maybe', 'will_go', 'dont_go'];

describe('isInterested', () => {
  it('counts maybe and will_go as picks, none and dont_go not', () => {
    expect(ALL.filter(isInterested)).toEqual(['maybe', 'will_go']);
  });
});

describe('matchesScope for my picks', () => {
  it.each([
    [null, ['maybe', 'will_go']],
    ['maybe', ['maybe', 'will_go']],
    ['will_go', ['will_go']],
  ] as const)('at level %s shows %j', (level, shown) => {
    const scope = { kind: 'me', level } as const;

    expect(ALL.filter((status) => matchesScope(scope, status, undefined))).toEqual(shown);
  });

  it('shows everything, dont_go included, without a lens', () => {
    expect(ALL.filter((status) => matchesScope({ kind: 'all' }, status, undefined))).toEqual(ALL);
  });
});

// ── What the lens removes from a timeline ─────────────────────────────────────
//
// The lens mutes sets on the timelines, never hides them, except my own
// "don't go" under My picks. Search widens exactly this away before landing.

describe('isRemovedByLens', () => {
  it('removes only my "don\'t go" under My picks, whatever its level', () => {
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'me', level: null }, status))).toEqual(['dont_go']);
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'me', level: 'will_go' }, status))).toEqual(['dont_go']);
  });

  it('removes nothing under Everything or a friend\'s lens', () => {
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'all' }, status))).toEqual([]);
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'friend', token: 't', level: null }, status))).toEqual([]);
  });
});
