import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';

type Props = {
  letter: string;
};

export function SectionSeparator({ letter }: Props) {
  return (
    <View className="px-4 py-2 bg-gray-300 white border-b border-border">
      <Text className="text-black text-base font-bold tracking-widest uppercase">
        {letter}
      </Text>
    </View>
  );
}
