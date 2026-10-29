import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenUIProvider } from '../../src/shell/ScreenUIContext';
import { InterestProvider } from '../../src/features/interests/InterestContext';
import { SocialProvider } from '../../src/features/social/SocialContext';
import { LensProvider } from '../../src/features/social/LensContext';
import { ConflictProvider } from '../../src/features/conflicts/ConflictContext';
import { ArtistDetailProvider } from '../../src/features/artist-detail/ArtistDetailContext';
import { ConflictDetailProvider } from '../../src/features/conflicts/ConflictDetailContext';
import { ArtistListFilterProvider } from '../../src/screens/artist-list/ArtistListFilterContext';
import { TimelineFilterProvider } from '../../src/screens/timeline/TimelineFilterContext';

// ── Provider tree for render measurements ─────────────────────────────────────
//
// The same nesting as App.tsx, minus StartupGate — the cache is populated
// directly instead, because what is measured is how a mounted screen reacts to
// an interaction, not how it boots.
//
// Reassure excludes the wrapper's own render cost from the results, so the
// numbers belong to the component under test.
//
// The navigator is not decoration: screens register their chrome through
// useTopBar, which is built on React Navigation's useFocusEffect and throws
// outside a navigation context. Mocking that away would remove the re-render it
// causes from the very counts being measured. The subject is rendered as a
// focused screen for the same reason.

const Stack = createNativeStackNavigator();

/**
 * The feature providers with no navigator.
 *
 * Use this for anything below screen level. The navigator contributes five host
 * elements of its own (RNSScreenStack, RNSScreen, RNCSafeAreaProvider and
 * friends), which swamps the count of a single row or block — so an element
 * budget measured through it would be mostly chrome.
 */
export function FeatureProviders({ children }: { children: React.ReactNode }) {
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
                        {children}
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

/** Feature providers plus a navigator, for whole screens. */
export function PerfProviders({ children }: { children: React.ReactElement }) {
  return (
    <NavigationContainer>
      <FeatureProviders>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="subject">
            {() => children}
          </Stack.Screen>
        </Stack.Navigator>
      </FeatureProviders>
    </NavigationContainer>
  );
}
