import React from 'react';
import { View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';

export function BottomBar() {
  const { state } = useScreenUI();
  const { bottomBar } = state;

  if (bottomBar.content === undefined) {
    return null;
  }

  return (
    <View className="bg-surface border-t border-border px-4 py-3">
      {bottomBar.content}
    </View>
  );
}
