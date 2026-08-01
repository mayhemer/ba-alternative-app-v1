import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { LoadingScreen } from '../components/ui/LoadingScreen';

type Props = {
  error: string | null;
  onRetry: () => void;
};

export function SplashScreen({ error, onRetry }: Props) {
  if (error === null) {
    return <LoadingScreen message="Loading brutal data" />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-red-400 text-base text-center px-8 mb-6">
        {error}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        className="border border-border px-6 py-3"
      >
        <Text className="text-textPrimary text-sm tracking-widest uppercase">
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}
