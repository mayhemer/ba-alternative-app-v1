import React from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Text } from '../ui/Text';
import { colors } from '../../styling/tokens';

// Single-letter placeholder from a display name: just the first character.
export function initialsOf(label: string): string {
  const trimmed = label.trim();
  if (trimmed === '') { return '?'; }
  return trimmed[0].toUpperCase();
}

type Props = {
  label: string;
  avatarUrl?: string;
  size?: number;
  // Ring color drawn around the avatar (e.g. surface bg to separate stacked avatars).
  ringColor?: string;
};

// A circular friend avatar — profile image when available, otherwise an
// initials chip on the friend accent color.
export function FriendAvatar({ label, avatarUrl, size = 22, ringColor }: Props) {
  const radius = size / 2;
  const ring = ringColor !== undefined ? { borderWidth: 1.5, borderColor: ringColor } : null;

  if (avatarUrl !== undefined && avatarUrl !== '') {
    return (
      <ExpoImage
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius, ...ring }}
        contentFit="cover"
        cachePolicy="memory"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.friend,
        alignItems: 'center',
        justifyContent: 'center',
        ...ring,
      }}
    >
      <Text
        style={{
          fontSize: Math.round(size * 0.42),
          color: colors.black,
          fontFamily: 'Bold-Default',
        }}
      >
        {initialsOf(label)}
      </Text>
    </View>
  );
}
