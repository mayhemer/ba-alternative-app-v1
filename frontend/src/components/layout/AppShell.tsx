import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationState } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { ArtistDetailSheet } from './ArtistDetailSheet';
import { ConflictDetailSheet } from './ConflictDetailSheet';
import { FeedbackToast } from './FeedbackToast';
import { LensPanel } from '../social/LensPanel';
import { useShareLinkHandler } from '../../navigation/useShareLinkHandler';
import { AppNavigator } from '../../navigation/AppNavigator';
import { navigationRef } from '../../navigation/navigationRef';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { colors } from '../../styling/tokens';

const NAV_STATE_KEY = 'navigation:state';

export function AppShell() {
  const [initialState, setInitialState] = useState<NavigationState | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const { isShort } = useLayoutMode();

  // Handle incoming add-friend share links (cold start + while running).
  useShareLinkHandler();

  useEffect(() => {
    async function restoreState(): Promise<void> {
      const stored = await AsyncStorage.getItem(NAV_STATE_KEY);
      if (stored !== null) {
        setInitialState(JSON.parse(stored) as NavigationState);
      }
      setIsReady(true);
    }
    void restoreState();
  }, []);

  const handleStateChange = useCallback((state: NavigationState | undefined): void => {
    if (state !== undefined) {
      void AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
    }
  }, []);

  if (!isReady) { 
    return <View style={{ flex: 1, backgroundColor: colors.background }} />; 
  }

  return (
    <GestureHandlerRootView className="flex-1">

      {/* Main app layout — TopBar, screen content, BottomBar.
          left/right edges matter in landscape: without them content sits under
          a notched phone's sensor housing. */}
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
        {/* Dropped on short viewports to give the timeline back its 56 px — the
            hamburger and the lens chip move into the BottomBar there. */}
        {!isShort && <TopBar />}
        <View className="flex-1">
          <NavigationContainer
            ref={navigationRef}
            initialState={initialState}
            onStateChange={handleStateChange}
          >
            <AppNavigator />
          </NavigationContainer>
          {/* View/share lens panel — drops from under the TopBar over the content */}
          <LensPanel />
          {/* Short viewports: the bar floats over the content, reclaiming its
              height for the timeline. Screens add BOTTOM_OVERLAY_CLEARANCE so
              their last row scrolls clear of it. */}
          {isShort && <BottomBar />}
        </View>
        {/* Otherwise in-flow, and kept a sibling of the content view rather than
            nested inside it — LensPanel is `inset: 0` within that view, so
            nesting would newly draw the lens backdrop over the DaySwitcher. */}
        {!isShort && <BottomBar />}
      </SafeAreaView>

      {/* Artist detail bottom sheet — always mounted, sheet manages its own visibility */}
      <ArtistDetailSheet />

      {/* Conflict detail sheet — always mounted, sheet manages its own visibility */}
      <ConflictDetailSheet />

      {/* Feedback toast — rendered last so it's always above backdrop and sheet */}
      <FeedbackToast />

    </GestureHandlerRootView>
  );
}
