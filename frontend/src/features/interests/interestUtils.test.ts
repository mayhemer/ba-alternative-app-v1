import { isInterested, matchesScope } from './interestUtils';
import type { InterestStatus } from './InterestContext';

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
