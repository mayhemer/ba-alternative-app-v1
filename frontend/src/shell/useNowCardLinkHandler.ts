import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { navigationRef } from '../navigation/navigationRef';
import { isNowCardLink } from '../navigation/nowCardLink';
import { usePlanStore } from '../screens/my-plan/PlanContext';
import { openPlanAtNow } from './openPlanAtNow';
import { closeAll } from '../utils/overlayHub';

// ── A tap on the lock-screen now card ─────────────────────────────────────────
//
// Opens My plan on today, scrolled to now, as the now pill does off My plan;
// first, as for the pill, everything open over the screen closes: the search,
// a panel, the drawer, a sheet, the star selector (utils/overlayHub closeAll).
// The link comes either as the one that launched the app or while it runs. On
// a cold start the navigator restores its saved state before it is ready, so
// the request waits for that, then closes and lands on top of the restored
// screen (the drawer can only be closed once the navigator is ready).
//
// Mounted in AppShell, next to the share-link handler.

export function useNowCardLinkHandler(): void {
  const store = usePlanStore();
  // A ref keeps the listeners stable, so they subscribe once.
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    let stopWaiting: (() => void) | null = null;

    function land(): void {
      closeAll();
      openPlanAtNow(storeRef.current);
    }

    function open(): void {
      if (navigationRef.isReady()) {
        land();
        return;
      }
      if (stopWaiting !== null) {
        return;
      }
      stopWaiting = navigationRef.addListener('ready', () => {
        stopWaiting?.();
        stopWaiting = null;
        land();
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
