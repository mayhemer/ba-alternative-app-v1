import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { navigationRef } from './navigationRef';
import { useSocialActions } from '../context/SocialContext';
import { useLens } from '../context/LensContext';
import { useAppContext } from '../store/AppContext';
import { useFeedback } from '../context/ScreenUIContext';
import { extractShareToken, SHARE_LINK_PATH } from '../adapters/baShareApiAdapter';

// Listens for incoming `…/add-friend/<token>` links (universal/app link or the
// ba:// scheme), adds the friend, and switches the lens to their schedule.
//
// Mounted inside AppShell, which renders only after the initial sync gate — so
// SocialProvider is ready and no separate pending-token queue is needed.
export function useShareLinkHandler(): void {
  const { addFriend } = useSocialActions();
  const { setScope } = useLens();
  const { state, setSelectedSlug } = useAppContext();
  const showFeedback = useFeedback();

  // Refs keep the URL handler stable so the listener isn't re-subscribed.
  const addFriendRef = useRef(addFriend);
  addFriendRef.current = addFriend;
  const setScopeRef = useRef(setScope);
  setScopeRef.current = setScope;
  const setSelectedSlugRef = useRef(setSelectedSlug);
  setSelectedSlugRef.current = setSelectedSlug;
  const selectedSlugRef = useRef(state.selectedSlug);
  selectedSlugRef.current = state.selectedSlug;
  const feedbackRef = useRef(showFeedback);
  feedbackRef.current = showFeedback;

  const lastHandledRef = useRef<string | null>(null);

  useEffect(() => {
    async function handle(url: string | null): Promise<void> {
      if (url === null) { return; }
      // Only act on add-friend links — ignore the app's own base/web URLs.
      if (!url.includes(`${SHARE_LINK_PATH}/`)) { return; }
      const token = extractShareToken(url);
      if (token === null || token === lastHandledRef.current) { return; }
      lastHandledRef.current = token;

      try {
        const friend = await addFriendRef.current(token);
        // The link may belong to a different festival edition — switch to it so
        // the friend's schedule resolves against the right data.
        if (friend.slug !== selectedSlugRef.current) {
          setSelectedSlugRef.current(friend.slug);
        }
        setScopeRef.current({ kind: 'friend', token: friend.token, level: null });
        if (navigationRef.isReady()) {
          navigationRef.navigate('ArtistList');
        }
        feedbackRef.current(`Viewing ${friend.label}'s schedule`, 'confirmation');
      } catch {
        feedbackRef.current('Could not open that link', 'warning');
      }

      // On web, strip the token from the address bar so a refresh won't re-add it.
      if (Platform.OS === 'web') {
        const history = globalThis.history as History | undefined;
        history?.replaceState?.({}, '', '/');
      }
    }

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => { void handle(event.url); });
    return () => sub.remove();
  }, []);
}
