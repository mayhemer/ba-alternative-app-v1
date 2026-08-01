import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from './Text';
import { colors } from '../../styling/tokens';

type Props = {
  message: string;
};

// The one full-screen "waiting" presentation, shared by the startup splash and the
// timeline's per-day wait. Extracted rather than duplicated so the two cannot drift
// apart — the app shows them back to back on a cold start.
export function LoadingScreen({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={colors.accent} />
      <Text className="mt-4 text-textSecondary text-sm tracking-widest uppercase">
        {message}
      </Text>
    </View>
  );
}
