import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text';
import { DrawerActions } from '@react-navigation/native';
import { navigationRef } from '../../navigation/navigationRef';
import { useScreenUI } from '../../context/ScreenUIContext';

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;
  const { LeftComponent, RightComponent } = topBar;

  return (
    <View className="h-14 flex-row items-center bg-surface border-b border-border px-4">

      {/* Left slot — hamburger always shown; LeftComponent layered after if set */}
      <View className="w-16 items-start">
        <TouchableOpacity onPress={() => navigationRef.dispatch(DrawerActions.openDrawer())} hitSlop={8}>
          <Text style={{ fontSize: 18, color: '#f0f0f0', letterSpacing: 2 }}>☰</Text>
        </TouchableOpacity>
        {LeftComponent !== undefined ? <LeftComponent /> : null}
      </View>

      {/* Center — title */}
      <View className="flex-1 items-center">
        <Text className="text-textPrimary text-sm font-semibold tracking-widest uppercase">
          Brutal Assault
        </Text>
      </View>

      {/* Right slot */}
      <View className="w-16 items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>

    </View>
  );
}
