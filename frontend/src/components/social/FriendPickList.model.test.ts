import { friendPickListModel } from './FriendPickList.model';
import type { FriendPick } from '../../context/SocialContext';

// ── Friends who picked an artist, as a model ──────────────────────────────────

const anna: FriendPick = { token: 't1', label: 'Anna', status: 'will_go' };
const ben: FriendPick = { token: 't2', label: 'Ben', status: 'maybe', avatarUrl: 'https://x/b.jpg' };

describe('friendPickListModel', () => {
  it('shows nothing when no friend picked the artist', () => {
    expect(friendPickListModel([]).shown).toBe(false);
  });

  it('names the friend when there is one', () => {
    expect(friendPickListModel([anna]).summary).toBe('Anna picked this');
  });

  it('counts the friends when there are more', () => {
    expect(friendPickListModel([anna, ben]).summary).toBe('2 friends picked this');
  });

  it('lists each with the star of their pick', () => {
    expect(friendPickListModel([anna, ben]).rows).toEqual([
      { key: 't1', label: 'Anna', avatarUrl: undefined, star: 'star' },
      { key: 't2', label: 'Ben', avatarUrl: 'https://x/b.jpg', star: 'star-half' },
    ]);
  });
});
