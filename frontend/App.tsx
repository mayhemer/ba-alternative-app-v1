import './global.css';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider } from './src/store/AppContext';
import { AuthProvider } from './src/auth/AuthContext';
import { StartupGate } from './src/store/StartupGate';
import { ScreenUIProvider } from './src/shell/ScreenUIContext';
import { ArtistDetailProvider } from './src/features/artist-detail/ArtistDetailContext';
import { ConflictDetailProvider } from './src/features/conflicts/ConflictDetailContext';
import { ConflictProvider } from './src/features/conflicts/ConflictContext';
import { InterestProvider } from './src/features/interests/InterestContext';
import { NoteProvider } from './src/features/notes/NoteContext';
import { StarSelectorProvider } from './src/features/interests/StarSelectorContext';
import { SocialProvider } from './src/features/social/SocialContext';
import { LensProvider } from './src/features/social/LensContext';
import { TimelineFilterProvider } from './src/screens/timeline/TimelineFilterContext';
import { PlanProvider } from './src/screens/my-plan/PlanContext';
import { SearchProvider } from './src/features/search/SearchContext';
import { AppShell } from './src/shell/AppShell';
import { Image as ExpoImage } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { applySystemLanguage, useAppLanguage } from './src/i18n/languageSources';

// Module scope on purpose. The native splash auto-hides as soon as the root view
// renders — before any effect could run — which is what left a white window while
// the JS bundle was still being evaluated. Holding it here means the BA image stays
// up until StartupGate has painted; StartupGate owns the handover.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Module scope too: the system's language must be set before anything renders.
// Nothing reads strings at import (i18n/language.ts), so this is early enough.
// A language chosen in Settings is restored with the rest of the local state,
// before StartupGate lets the app show (store/uiStatePersistence).
applySystemLanguage();

// ── App content: full provider tree, mounted once startup hydration completes ─

function AppContent() {
  return (
    <ScreenUIProvider>
      <InterestProvider>
        <StarSelectorProvider>
          <SocialProvider>
            <LensProvider>
              <ConflictProvider>
                <ArtistDetailProvider>
                  <ConflictDetailProvider>
                    <TimelineFilterProvider>
                      <PlanProvider>
                        <SearchProvider>
                          <NoteProvider>
                            <AppShell />
                          </NoteProvider>
                        </SearchProvider>
                      </PlanProvider>
                    </TimelineFilterProvider>
                  </ConflictDetailProvider>
                </ArtistDetailProvider>
              </ConflictProvider>
            </LensProvider>
          </SocialProvider>
        </StarSelectorProvider>
      </InterestProvider>
    </ScreenUIProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  // A language chosen in Settings, or a change of the system language while the
  // app runs (Android, web), remounts the content in the new one; the session,
  // the data cache and the open screen (AppShell restores it) stay.
  const language = useAppLanguage();

  useEffect(() => {
    // On web: if this render is happening inside the OAuth popup window,
    // this reads the code from the URL, posts it to the parent window, and
    // closes the popup so promptAsync() can resolve. On native it's a no-op.
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    // 'memory' must match the policy the icons render with in ArtistDetailScreen —
    // a prefetch into a different cache than the one the view reads leaves them cold.
    ExpoImage.prefetch([
      require('./assets/spotify-icon-72.png'),
      require('./assets/tidal-icon-72.png'),
      require('./assets/metal-archives-icon-72.png'),
      require('./assets/setlist-fm-icon-72.png'),
    ], 'memory');
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthProvider>
          <StartupGate>
            <AppContent key={language} />
          </StartupGate>
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
