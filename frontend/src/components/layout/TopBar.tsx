import React from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { navigationRef } from '../../navigation/navigationRef';
import { useScreenUI } from '../../context/ScreenUIContext';
import { WIDE_SCREEN_WIDTH_BREAKPOINT } from '../../styling/tokens';

/** Logo is 601 × 231 px; keep its aspect ratio while fitting inside the 56 px (h-14) bar. */
const LOGO_HEIGHT = 34;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (601 / 231));

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;
  const { LeftComponent, RightComponent } = topBar;
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_SCREEN_WIDTH_BREAKPOINT;

  return (
    <View className="h-14 flex-row items-center bg-surface border-b border-border px-4">

      {/* Left slot — hamburger hidden on wide screens (drawer is permanent); LeftComponent layered after if set */}
      <View className="w-16 items-start">
        {!isWide && (
          <TouchableOpacity onPress={() => navigationRef.dispatch(DrawerActions.openDrawer())} hitSlop={8}>
            <Ionicons name={'menu-outline'} size={28} color={'#f0f0f0'}/>
          </TouchableOpacity>
        )}
        {LeftComponent !== undefined ? <LeftComponent /> : null}
      </View>

      {/* Center — logo */}
      <View className="flex-1 items-center">
        <ExpoImage
          source={require('../../../assets/logo-ba.png')}
          style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
          contentFit="contain"
          accessibilityLabel="Brutal Assault"
        />
      </View>

      {/* Right slot */}
      <View className="w-16 items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>

    </View>
  );
}
