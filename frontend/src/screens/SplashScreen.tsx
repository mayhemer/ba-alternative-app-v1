import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text';

type Props = {
  error: string | null;
  onRetry: () => void;
};

export function SplashScreen({ error, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      {error === null ? (
        <>
          <ActivityIndicator size="large" color="#e8c84a" />
          <Text className="mt-4 text-textSecondary text-sm tracking-widest uppercase">
            Loading brutal data
          </Text>
        </>
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}
