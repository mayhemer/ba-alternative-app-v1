import './global.css';
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider } from './src/store/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { StartupGate } from './src/store/StartupGate';
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
import { Image as ExpoImage } from 'expo-image';

// ── App content: full provider tree, mounted once startup hydration completes ─

function AppContent() {
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
      require('./assets/setlist-fm-icon-72.png'),
    ]);
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <StartupGate>
            <AppContent />
          </StartupGate>
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
