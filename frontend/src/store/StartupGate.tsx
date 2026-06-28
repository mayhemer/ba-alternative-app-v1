import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from './AppContext';
import { SplashScreen } from '../screens/SplashScreen';
import { startSync, stop as stopSync } from '../sync/backgroundSyncService';
import { hydrateLocalState } from './uiStatePersistence';

// ── Startup umbrella ──────────────────────────────────────────────────────────
//
// Single owner of the boot lifecycle. After the slug resolves it runs external
// data load and local-state hydration concurrently; one Promise.all resolution
// flips the splash → full UI:
//
//   resolve slug → (load external data ∥ hydrate local state) → both done
//                → lift splash, render full UI → (logged in) server interest sync
//
// Replaces the previous RootGate, which blocked the splash only on the external
// load and let providers hydrate local state late (causing the restore races).

export function StartupGate({ children }: { children: React.ReactNode }) {
  const { state, setSyncTime, emitCacheRefresh } = useAppContext();
  const { selectedSlug, lastSyncTime } = state;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable ref so the sync callbacks always read the latest sync time.
  const lastSyncTimeRef = useRef(lastSyncTime);
  useEffect(() => { lastSyncTimeRef.current = lastSyncTime; }, [lastSyncTime]);

  const runStartup = useCallback((slug: string): void => {
    setReady(false);
    setError(null);

    const externalLoad = new Promise<void>((resolve, reject) => {
      startSync(slug, lastSyncTimeRef.current, {
        onFirstLoadSuccess: () => {
          // Festival cache is populated — notify cache-reading consumers.
          emitCacheRefresh();
          resolve();
        },
        onFirstLoadError: (err) => { reject(err); },
        onRefreshComplete: () => emitCacheRefresh(),
        onSyncTimeUpdated: (time) => setSyncTime(time),
      });
    });

    Promise.all([externalLoad, hydrateLocalState(slug)])
      .then(() => { setReady(true); })
      .catch((err) => { setError(err instanceof Error ? err.message : String(err)); });
  }, [emitCacheRefresh, setSyncTime]);

  // (Re-)run startup whenever the slug changes. Held until the slug resolves
  // (null) so we boot once under the correct slug.
  useEffect(() => {
    if (selectedSlug === null) {
      return;
    }
    runStartup(selectedSlug);
    return () => stopSync();
  }, [selectedSlug, runStartup]);

  const handleRetry = useCallback((): void => {
    if (selectedSlug !== null) {
      runStartup(selectedSlug);
    }
  }, [selectedSlug, runStartup]);

  if (!ready || error !== null) {
    return <SplashScreen error={error} onRetry={handleRetry} />;
  }

  return <>{children}</>;
}
