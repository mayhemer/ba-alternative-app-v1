import React from 'react';
import { Text, View } from 'react-native';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';

export function ArtistListScreen() {
  useTopBar({ title: 'Artists' });
  useBottomBar({});

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-textSecondary text-sm tracking-widest uppercase">
        Artist List — coming soon
      </Text>
    </View>
  );
}
