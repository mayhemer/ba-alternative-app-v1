import type { SharedInterestStatus } from '../../adapters/baShareApiAdapter';

// ── A friend's avatar: what it shows ──────────────────────────────────────────
//
// The profile photo, or the first letter of the name on the friend colour; with
// a status, a star badge at the top-right corner (full for a Must-see, half for
// a Maybe). Every size follows from the avatar's.

export type FriendAvatarModel = {
  size: number;
  /** Null: draw the initial instead. */
  photo: string | null;
  initial: string;
  initialFontSize: number;
  badge: { icon: 'star' | 'star-half'; size: number; offset: number } | null;
};

/** Single-letter placeholder from a display name: just the first character. */
export function initialsOf(label: string): string {
  const trimmed = label.trim();
  if (trimmed === '') { return '?'; }
  return trimmed[0].toUpperCase();
}

export function friendAvatarModel({ label, avatarUrl, size, status }: { label: string; avatarUrl?: string; size: number; status?: SharedInterestStatus }): FriendAvatarModel {
  return {
    size,
    photo: avatarUrl !== undefined && avatarUrl !== '' ? avatarUrl : null,
    initial: initialsOf(label),
    initialFontSize: Math.round(size * 0.67),
    badge: status === undefined ? null : {
      icon: status === 'will_go' ? 'star' : 'star-half',
      size: Math.max(9, Math.round(size * 0.6)),
      offset: Math.round(size * 0.18),
    },
  };
}
