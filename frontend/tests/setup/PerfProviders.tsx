import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenUIProvider } from '../../src/context/ScreenUIContext';
import { InterestProvider } from '../../src/context/InterestContext';
import { SocialProvider } from '../../src/context/SocialContext';
import { LensProvider } from '../../src/context/LensContext';
import { ConflictProvider } from '../../src/context/ConflictContext';
import { ArtistDetailProvider } from '../../src/context/ArtistDetailContext';
import { ConflictDetailProvider } from '../../src/context/ConflictDetailContext';
import { ArtistListFilterProvider } from '../../src/context/ArtistListFilterContext';
import { TimelineFilterProvider } from '../../src/context/TimelineFilterContext';

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

export function PerfProviders({ children }: { children: React.ReactElement }) {
  return (
    <NavigationContainer>
      <ScreenUIProvider>
        <InterestProvider>
          <SocialProvider>
            <LensProvider>
              <ConflictProvider>
                <ArtistDetailProvider>
                  <ConflictDetailProvider>
                    <ArtistListFilterProvider>
                      <TimelineFilterProvider>
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="subject">
                            {() => children}
                          </Stack.Screen>
                        </Stack.Navigator>
                      </TimelineFilterProvider>
                    </ArtistListFilterProvider>
                  </ConflictDetailProvider>
                </ArtistDetailProvider>
              </ConflictProvider>
            </LensProvider>
          </SocialProvider>
        </InterestProvider>
      </ScreenUIProvider>
    </NavigationContainer>
  );
}
