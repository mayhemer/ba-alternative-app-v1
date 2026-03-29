import React from 'react';
import { Text, View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;

  return (
    <View className="h-14 flex-row items-center justify-between bg-surface border-b border-border px-4">
      {/* Left slot */}
      <View className="flex-1 items-start">
        {topBar.leftContent ?? null}
      </View>

      {/* Title */}
      <View className="flex-1 items-center">
        <Text className="text-textPrimary text-sm font-semibold tracking-widest uppercase">
          {topBar.title}
        </Text>
      </View>

      {/* Right slot */}
      <View className="flex-1 items-end">
        {topBar.rightContent ?? null}
      </View>
    </View>
  );
}
