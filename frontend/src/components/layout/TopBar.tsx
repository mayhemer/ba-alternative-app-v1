import React from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useScreenUI } from '../../context/ScreenUIContext';
import { DrawerButton } from './DrawerButton';
import { TOPBAR_HEIGHT } from '../../styling/tokens';

/** Logo is 601 × 231 px; keep its aspect ratio while fitting inside the 56 px (h-14) bar. */
const LOGO_HEIGHT = 34;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (601 / 231));

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;
  const { LeftComponent, RightComponent } = topBar;

  return (
    <View
      className="flex-row items-center bg-surface border-b border-border px-4"
      style={{ height: TOPBAR_HEIGHT }}
    >

      {/* Left slot — DrawerButton renders nothing on wide screens (drawer is permanent); LeftComponent layered after if set */}
      <View className="w-16 items-start">
        <DrawerButton />
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
