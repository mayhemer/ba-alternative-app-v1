import { strings } from '../../i18n/strings';
import type { FriendPick } from './SocialContext';

// ── Friends who picked an artist: what the list shows ─────────────────────────
//
// A summary under the facepile — the friend's name for one, a count for more —
// and, expanded, each friend with the star of their pick. Nothing at all when no
// friend picked the artist.

export type FriendPickListModel = {
  shown: boolean;
  summary: string;
  rows: { key: string; label: string; avatarUrl?: string; star: 'star' | 'star-half' }[];
};

export function friendPickListModel(friends: FriendPick[]): FriendPickListModel {
  return {
    shown: friends.length > 0,
    summary: friends.length === 1 ? strings().friendPickList.pickedByOne(friends[0].label) : strings().friendPickList.pickedByMany(friends.length),
    rows: friends.map((f) => ({ key: f.token, label: f.label, avatarUrl: f.avatarUrl, star: f.status === 'will_go' ? 'star' : 'star-half' })),
  };
}
