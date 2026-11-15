import { isInterested, isRemovedByLens, matchesScope } from './interestUtils';
import type { InterestStatus } from '../features/interests/InterestContext';

// ── 'dont_go' is a decision against an artist ────────────────────────────────
//
// For everything that asks "is this a pick?" it is the same as 'none'.

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
// Under My picks or a friend's lens a timeline shows only the lens's picks; the
// rest are removed, as from the artist list. Everything removes nothing. Search
// widens exactly this away before landing.

describe('isRemovedByLens', () => {
  it('removes all but my picks under My picks, by its level', () => {
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'me', level: null }, status, undefined))).toEqual(['none', 'dont_go']);
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'me', level: 'will_go' }, status, undefined))).toEqual(['none', 'maybe', 'dont_go']);
  });

  it('removes nothing under Everything, my "don\'t go" included', () => {
    expect(ALL.filter((status) => isRemovedByLens({ kind: 'all' }, status, undefined))).toEqual([]);
  });

  it('removes the sets the friend hasn\'t picked under their lens, whatever my pick', () => {
    const friend = { kind: 'friend', token: 't', level: null } as const;
    expect(ALL.filter((status) => isRemovedByLens(friend, status, undefined))).toEqual(ALL);
    expect(ALL.filter((status) => isRemovedByLens(friend, status, 'maybe'))).toEqual([]);
    expect(isRemovedByLens({ ...friend, level: 'will_go' }, 'will_go', 'maybe')).toBe(true);
  });
});
