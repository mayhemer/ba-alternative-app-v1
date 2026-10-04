import React, { useCallback, useEffect, useState } from 'react';
import * as NativeSplash from 'expo-splash-screen';
import { useAppContext } from './AppContext';
import { SplashScreen } from '../screens/SplashScreen';
import { startSync, stop as stopSync } from '../sync/backgroundSyncService';
import { hydrateLocalState } from './uiStatePersistence';

// Perf builds only (EXPO_PUBLIC_PERF_MARKS=1 in the `perf` EAS profile). The
// device perf runner reads this line from logcat to time a cold start to the
// moment the app is usable — `am start -W` only reports the first frame, which
// is the splash. Inlined at build time, so other builds carry no marker.
const PERF_MARKS = process.env.EXPO_PUBLIC_PERF_MARKS === '1';
// Matched literally by scripts/test-perf-device.ts — change both together.
const PERF_MARK_STARTUP_READY = '[perf] startup:ready';

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
  const { state } = useAppContext();
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

  // The first frame painted with the app rather than the splash. Logged a frame
  // after `ready` flips so the timestamp is paint, not the state change.
  useEffect(() => {
    if (!PERF_MARKS || !ready) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      console.log(PERF_MARK_STARTUP_READY);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  const runStartup = useCallback((slug: string): void => {
    setReady(false);
    setError(null);

    const externalLoad = new Promise<void>((resolve, reject) => {
      startSync(slug, {
        // Cache-reading consumers are notified by cacheService itself, so this
        // only has to release the gate.
        onFirstLoadSuccess: () => { resolve(); },
        onFirstLoadError: (err) => { reject(err); },
      });
    });

    Promise.all([externalLoad, hydrateLocalState(slug)])
      .then(() => { setReady(true); })
      .catch((err) => { setError(err instanceof Error ? err.message : String(err)); });
  }, []);

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
