import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';

type Props = {
  letter: string;
};

export function SectionSeparator({ letter }: Props) {
  return (
    <View className="px-4 py-1 bg-background border-b border-border">
      <Text className="text-textSecondary text-xs font-bold tracking-widest uppercase">
        {letter}
      </Text>
    </View>
  );
}
