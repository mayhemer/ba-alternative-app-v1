import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { navigationRef } from './navigationRef';
import { useFeedback } from '../context/ScreenUIContext';
import { useOpenSharedSchedule } from '../hooks/useOpenSharedSchedule';
import { extractShareToken, SHARE_LINK_PATH } from '../adapters/baShareApiAdapter';

// Listens for incoming `…/add-friend/<token>` links (universal/app link or the
// ba:// scheme), adds the friend, and switches the lens to their schedule.
//
// Mounted inside AppShell, which renders only after the initial sync gate — so
// SocialProvider is ready and no separate pending-token queue is needed.
export function useShareLinkHandler(): void {
  const openSharedSchedule = useOpenSharedSchedule();
  const showFeedback = useFeedback();

  // Refs keep the URL handler stable so the listener isn't re-subscribed.
  const openSharedScheduleRef = useRef(openSharedSchedule);
  openSharedScheduleRef.current = openSharedSchedule;
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
        // Adds the friend, switches to their edition if needed, and focuses the lens.
        const friend = await openSharedScheduleRef.current(token);
        if (navigationRef.isReady()) {
          navigationRef.navigate('ArtistList');
        }
        feedbackRef.current(`Viewing ${friend.label}'s schedule`, 'confirmation');
      } catch {
        feedbackRef.current('Could not open that link', 'warning');
      }

      // On web, strip the token from the address bar so a refresh won't re-add it.
      // The existing state object is carried over rather than replaced: the back
      // history mirrors its depth into it (navigation/BackHistoryTracker), and
      // this runs at cold start, right when that baseline entry is seeded.
      if (Platform.OS === 'web') {
        const history = globalThis.history as History | undefined;
        history?.replaceState?.(history.state, '', '/');
      }
    }

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => { void handle(event.url); });
    return () => sub.remove();
  }, []);
}
