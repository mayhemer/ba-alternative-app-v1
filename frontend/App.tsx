import './global.css';
import React, { useCallback, useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppContext } from './src/store/AppContext';
import { ScreenUIProvider } from './src/context/ScreenUIContext';
import { ArtistDetailProvider } from './src/context/ArtistDetailContext';
import { InterestProvider } from './src/context/InterestContext';
import { ArtistListFilterProvider } from './src/context/ArtistListFilterContext';
import { TimelineFilterProvider } from './src/context/TimelineFilterContext';
import { AppShell } from './src/components/layout/AppShell';
import { SplashScreen } from './src/screens/SplashScreen';
import { startSync, stop as stopSync } from './src/sync/backgroundSyncService';

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
      onFirstLoadSuccess: () => setLoading(false),
      onFirstLoadError: (err) => {
        setLoading(false);
        setError(err.message);
      },
      onRefreshComplete: () => emitCacheRefresh(),
      onSyncTimeUpdated: (time) => setSyncTime(time),
    });
  }, [setLoading, setError, emitCacheRefresh, setSyncTime]);

  const handleRetry = useCallback(() => {
    syncWithSlug(selectedSlug);
  }, [syncWithSlug, selectedSlug]);

  // (Re-)start sync whenever the selected slug changes
  useEffect(() => {
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
        <ArtistDetailProvider>
          <ArtistListFilterProvider>
            <TimelineFilterProvider>
              <AppShell />
            </TimelineFilterProvider>
          </ArtistListFilterProvider>
        </ArtistDetailProvider>
      </InterestProvider>
    </ScreenUIProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  useFonts({
    'Regular-Default': require('./assets/WorkSans-Regular.ttf'),
    'Bold-Default': require('./assets/WorkSans-Bold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootGate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
