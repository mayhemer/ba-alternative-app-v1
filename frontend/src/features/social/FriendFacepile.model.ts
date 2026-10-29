import type { FriendPick } from './SocialContext';

// ── The friends' facepile: what it shows ──────────────────────────────────────
//
// Up to three overlapping avatars, and a "+N" chip for the friends beyond them.

export const MAX_AVATARS = 3;

export function friendFacepileModel(friends: FriendPick[]): { shown: FriendPick[]; extra: number } {
  const shown = friends.slice(0, MAX_AVATARS);
  return { shown, extra: friends.length - shown.length };
}
