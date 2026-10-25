import { friendFacepileModel } from './FriendFacepile.model';
import type { FriendPick } from '../../context/SocialContext';

// ── The friends' facepile, as a model ─────────────────────────────────────────

const friends = (n: number): FriendPick[] => Array.from({ length: n }, (_, i) => ({ token: `t${i}`, label: `F${i}`, status: 'maybe' }));

describe('friendFacepileModel', () => {
  it('shows nobody for no friends', () => {
    expect(friendFacepileModel(friends(0))).toEqual({ shown: [], extra: 0 });
  });

  it('shows all three when there are three, with no chip', () => {
    expect(friendFacepileModel(friends(3)).extra).toBe(0);
  });

  it('shows the first three and "+2" for five', () => {
    const m = friendFacepileModel(friends(5));
    expect([m.shown.map((f) => f.token), m.extra]).toEqual([['t0', 't1', 't2'], 2]);
  });
});
