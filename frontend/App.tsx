import './global.css';
import React, { useCallback, useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider, useAppContext } from './src/store/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { ScreenUIProvider } from './src/context/ScreenUIContext';
import { ArtistDetailProvider } from './src/context/ArtistDetailContext';
import { ConflictDetailProvider } from './src/context/ConflictDetailContext';
import { ConflictProvider } from './src/context/ConflictContext';
import { InterestProvider } from './src/context/InterestContext';
import { SocialProvider } from './src/context/SocialContext';
import { LensProvider } from './src/context/LensContext';
import { ArtistListFilterProvider } from './src/context/ArtistListFilterContext';
import { TimelineFilterProvider } from './src/context/TimelineFilterContext';
import { AppShell } from './src/components/layout/AppShell';
import { SplashScreen } from './src/screens/SplashScreen';
import { startSync, stop as stopSync } from './src/sync/backgroundSyncService';
import { Image as ExpoImage } from 'expo-image';

// ── Root gate: handles loading / error / ready states ─────────────────────────

function RootGate() {
  const { state, setLoading, setError, setSyncTime, emitCacheRefresh } =
    useAppContext();
  const { selectedSlug, isLoading, lastError, lastSyncTime } = state;

  // Stable ref so sync callbacks always read the latest value without re-subscribing
  const lastSyncTimeRef = useRef(lastSyncTime);
  useEffect(() => {
    lastSyncTimeRef.current = lastSyncTime;
  }, [lastSyncTime]);

  const syncWithSlug = useCallback((slug: string): void => {
    setLoading(true);
    setError(null);
    startSync(slug, lastSyncTimeRef.current, {
      onFirstLoadSuccess: () => {
        setLoading(false);
        // Signal that the festival cache is now populated so cache-reading
        // consumers (conflicts) recompute. The latch in useCacheRefresh ensures
        // this is caught even though it fires before those providers mount.
        emitCacheRefresh();
      },
      onFirstLoadError: (err) => {
        setLoading(false);
        setError(err.message);
      },
      onRefreshComplete: () => emitCacheRefresh(),
      onSyncTimeUpdated: (time) => setSyncTime(time),
    });
  }, [setLoading, setError, emitCacheRefresh, setSyncTime]);

  const handleRetry = useCallback(() => {
    if (selectedSlug !== null) {
      syncWithSlug(selectedSlug);
    }
  }, [syncWithSlug, selectedSlug]);

  // (Re-)start sync whenever the selected slug changes. Held until the slug is
  // resolved from storage (null) so we sync once under the correct slug instead
  // of racing a default-then-stored double sync.
  useEffect(() => {
    if (selectedSlug === null) {
      return;
    }
    syncWithSlug(selectedSlug);
    return () => stopSync();
  }, [selectedSlug, syncWithSlug]);

  if (isLoading) {
    return <SplashScreen error={null} onRetry={handleRetry} />;
  }

  if (lastError !== null) {
    return <SplashScreen error={lastError} onRetry={handleRetry} />;
  }

  return (
    <ScreenUIProvider>
      <InterestProvider>
        <SocialProvider>
          <LensProvider>
            <ConflictProvider>
              <ArtistDetailProvider>
                <ConflictDetailProvider>
                  <ArtistListFilterProvider>
                    <TimelineFilterProvider>
                      <AppShell />
                    </TimelineFilterProvider>
                  </ArtistListFilterProvider>
                </ConflictDetailProvider>
              </ArtistDetailProvider>
            </ConflictProvider>
          </LensProvider>
        </SocialProvider>
      </InterestProvider>
    </ScreenUIProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  useFonts({
    'Regular-Default': require('./assets/WorkSans-Regular.ttf'),
    'Bold-Default': require('./assets/WorkSans-Bold.ttf'),
    //'Regular-Default': require('./assets/DarkerGrotesque-Regular.ttf'),
    //'Bold-Default': require('./assets/DarkerGrotesque-Bold.ttf'),
  });

  useEffect(() => {
    // On web: if this render is happening inside the OAuth popup window,
    // this reads the code from the URL, posts it to the parent window, and
    // closes the popup so promptAsync() can resolve. On native it's a no-op.
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    ExpoImage.prefetch([
      require('./assets/spotify-icon-72.png'),
      require('./assets/tidal-icon-72.png'),
      require('./assets/metal-archives-icon-72.png'),
    ]);
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <RootGate />
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
