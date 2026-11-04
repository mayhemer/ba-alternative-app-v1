import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { navigationRef } from '../navigation/navigationRef';
import { isNowCardLink } from '../navigation/nowCardLink';
import { usePlanStore } from '../screens/my-plan/PlanContext';
import { useSearch } from '../features/search/SearchContext';
import { openPlanAtNow } from './openPlanAtNow';

// ── A tap on the lock-screen now card ─────────────────────────────────────────
//
// Opens My plan on today, scrolled to now, as the now pill does off My plan;
// an open search closes first, as it does for the pill. The link comes either
// as the one that launched the app or while it runs. On a cold start the
// navigator restores its saved state before it is ready, so the request waits
// for that and then lands on top of the restored screen.
//
// Mounted in AppShell, next to the share-link handler.

export function useNowCardLinkHandler(): void {
  const store = usePlanStore();
  const { close: closeSearch } = useSearch();
  // Refs keep the listeners stable, so they subscribe once.
  const storeRef = useRef(store);
  storeRef.current = store;
  const closeSearchRef = useRef(closeSearch);
  closeSearchRef.current = closeSearch;

  useEffect(() => {
    let stopWaiting: (() => void) | null = null;

    function open(): void {
      closeSearchRef.current();
      if (navigationRef.isReady()) {
        openPlanAtNow(storeRef.current);
        return;
      }
      if (stopWaiting !== null) {
        return;
      }
      stopWaiting = navigationRef.addListener('ready', () => {
        stopWaiting?.();
        stopWaiting = null;
        openPlanAtNow(storeRef.current);
      });
    }

    function handle(url: string | null): void {
      if (isNowCardLink(url)) {
        open();
      }
    }

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => { handle(event.url); });
    return () => {
      sub.remove();
      stopWaiting?.();
    };
  }, []);
}
