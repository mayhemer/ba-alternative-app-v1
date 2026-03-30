import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { ArtistDetailSheet } from './ArtistDetailSheet';
import { AppNavigator } from '../../navigation/AppNavigator';
import { navigationRef } from '../../navigation/navigationRef';

export function AppShell() {
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

      {/* Artist detail bottom sheet — always mounted, sheet manages its own visibility */}
      <ArtistDetailSheet />

    </GestureHandlerRootView>
  );
}
