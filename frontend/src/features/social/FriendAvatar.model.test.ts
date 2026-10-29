import { friendAvatarModel, initialsOf } from './FriendAvatar.model';

// ── A friend's avatar, as a model ─────────────────────────────────────────────

describe('friendAvatarModel', () => {
  it('shows the photo when there is one', () => {
    expect(friendAvatarModel({ label: 'Anna', avatarUrl: 'https://x/a.jpg', size: 22 }).photo).toBe('https://x/a.jpg');
  });

  it('shows the initial, sized from the avatar, without a photo', () => {
    expect(friendAvatarModel({ label: 'anna', avatarUrl: '', size: 22 })).toMatchObject({ photo: null, initial: 'A', initialFontSize: 15 });
  });

  it('badges a pick: a full star for a Must-see, a half for a Maybe, sized from the avatar', () => {
    expect(friendAvatarModel({ label: 'A', size: 22, status: 'will_go' }).badge).toEqual({ icon: 'star', size: 13, offset: 4 });
    expect(friendAvatarModel({ label: 'A', size: 22, status: 'maybe' }).badge?.icon).toBe('star-half');
  });

  it('keeps the badge readable on a small avatar', () => {
    expect(friendAvatarModel({ label: 'A', size: 10, status: 'maybe' }).badge?.size).toBe(9);
  });

  it('has no badge without a pick', () => {
    expect(friendAvatarModel({ label: 'A', size: 22 }).badge).toBeNull();
  });
});

describe('initialsOf', () => {
  it('is "?" for a blank name', () => {
    expect([initialsOf(''), initialsOf('   ')]).toEqual(['?', '?']);
  });
});
