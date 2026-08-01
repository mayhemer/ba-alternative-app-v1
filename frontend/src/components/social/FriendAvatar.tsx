import React from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { colors } from '../../styling/tokens';
import type { SharedInterestStatus } from '../../adapters/baShareApiAdapter';

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
  // When set, overlays a small star badge at the top-right corner reflecting the
  // friend's interest: full star for will_go, half star for maybe.
  status?: SharedInterestStatus;
};

// A circular friend avatar — profile image when available, otherwise an
// initials chip on the friend accent color.
export function FriendAvatar({ label, avatarUrl, size = 22, status }: Props) {
  const radius = size / 2;
  // 1px white ring to lift the avatar off the background and separate stacked avatars.
  const ring = { borderWidth: 1, borderColor: colors.accent };

  const avatar =
    avatarUrl !== undefined && avatarUrl !== '' ? (
      <ExpoImage
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius, ...ring }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
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
            fontSize: Math.round(size * 0.67),
            color: colors.white,
            fontFamily: 'Bold-Default',
          }}
        >
          {initialsOf(label)}
        </Text>
      </View>
    );

  if (status === undefined) {
    return avatar;
  }

  // Star badge — an outlined star (dark star behind, gold in front) so it reads
  // over both photos and the initials chip.
  const iconName = status === 'will_go' ? 'star' : 'star-half';
  const starSize = Math.max(9, Math.round(size * 0.6));
  const offset = Math.round(size * 0.18);

  return (
    <View style={{ width: size, height: size }}>
      {avatar}
      <View
        style={{ position: 'absolute', top: -offset, right: -offset, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={iconName} size={starSize + 2} color={colors.background} style={{ position: 'absolute' }} />
        <Ionicons name={iconName} size={starSize} color={colors.accent} />
      </View>
    </View>
  );
}
