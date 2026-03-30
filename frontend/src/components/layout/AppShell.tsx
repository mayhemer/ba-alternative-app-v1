import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { AppNavigator } from '../../navigation/AppNavigator';
import { navigationRef } from '../../navigation/navigationRef';
import { useArtistDetail } from '../../context/ArtistDetailContext';

// ArtistDetailScreen overlay — imported when built
// import { ArtistDetailScreen } from '../../screens/ArtistDetailScreen';

export function AppShell() {
  const { detailState } = useArtistDetail();
  const isDetailOpen = detailState.artist !== null;

  return (
    <GestureHandlerRootView className="flex-1">

      {/* Main app layout — TopBar, screen content, BottomBar */}
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <TopBar />
        <View className="flex-1">
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </View>
        <BottomBar />
      </SafeAreaView>

      {/* ArtistDetail overlay — rendered AFTER SafeAreaView so it sits above
          TopBar/BottomBar via z-order. Covers entire screen including safe areas. */}
      {isDetailOpen && (
        <View className="absolute inset-0">
          {/* TODO: render ArtistDetailScreen here when built */}
        </View>
      )}

    </GestureHandlerRootView>
  );
}
