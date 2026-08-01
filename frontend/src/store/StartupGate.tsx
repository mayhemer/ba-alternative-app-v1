import React, { useCallback, useEffect, useState } from 'react';
import * as NativeSplash from 'expo-splash-screen';
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
//
// "External data load" resolves from whichever source produces data first — the
// persisted cache or the network — so this gate no longer implies a round trip.

export function StartupGate({ children }: { children: React.ReactNode }) {
  const { state, emitCacheRefresh } = useAppContext();
  const { selectedSlug } = state;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hand over from the native splash once this gate has painted — normally its own
  // loading screen, or the app itself when a persisted cache makes startup instant.
  // Deliberately not keyed on `ready`: the handover has to happen either way, and a
  // gate that finishes in one frame would otherwise leave the native splash up
  // forever. One frame of delay so the handover lands on painted content.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      NativeSplash.hideAsync().catch(() => undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const runStartup = useCallback((slug: string): void => {
    setReady(false);
    setError(null);

    const externalLoad = new Promise<void>((resolve, reject) => {
      startSync(slug, {
        onFirstLoadSuccess: () => {
          // Festival cache is populated — notify cache-reading consumers.
          emitCacheRefresh();
          resolve();
        },
        onFirstLoadError: (err) => { reject(err); },
        onRefreshComplete: () => emitCacheRefresh(),
      });
    });

    Promise.all([externalLoad, hydrateLocalState(slug)])
      .then(() => { setReady(true); })
      .catch((err) => { setError(err instanceof Error ? err.message : String(err)); });
  }, [emitCacheRefresh]);

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
