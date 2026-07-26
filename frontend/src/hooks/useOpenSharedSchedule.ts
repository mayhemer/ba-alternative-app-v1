import { useCallback } from 'react';
import { useSocialActions } from '../context/SocialContext';
import { useLens } from '../context/LensContext';
import { useAppContext } from '../store/AppContext';
import type { FriendSchedule } from '../cache/socialCache';

/**
 * Fetches a shared schedule by token, adds it to the friends list, switches to
 * its festival edition when it differs from the current one, and focuses the lens
 * on it. Shared by the paste flow (LensPanel) and the deep-link handler so the two
 * can't diverge — a friend's picks reference artist IDs in *their* edition, so the
 * app must be on that edition to render them.
 *
 * Returns the loaded FriendSchedule (for feedback); throws if the fetch fails.
 */
export function useOpenSharedSchedule(): (token: string) => Promise<FriendSchedule> {
  const { addFriend } = useSocialActions();
  const { setScope } = useLens();
  const { state, setSelectedSlug } = useAppContext();
  const selectedSlug = state.selectedSlug;

  return useCallback(
    async (token: string): Promise<FriendSchedule> => {
      const friend = await addFriend(token);
      if (friend.slug !== selectedSlug) {
        setSelectedSlug(friend.slug);
      }
      setScope({ kind: 'friend', token: friend.token, level: null });
      return friend;
    },
    [addFriend, setScope, setSelectedSlug, selectedSlug],
  );
}
