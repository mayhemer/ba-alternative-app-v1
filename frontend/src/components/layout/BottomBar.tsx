import React from 'react';
import { View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';

export function BottomBar() {
  const { state } = useScreenUI();
  const { ContentComponent } = state.bottomBar;

  if (ContentComponent === undefined) {
    return null;
  }

  return (
    <View className="bg-surface border-t border-border px-4 py-3">
      <ContentComponent />
    </View>
  );
}
