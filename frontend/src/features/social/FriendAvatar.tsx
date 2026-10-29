import React from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { colors } from '../../styling/tokens';
import type { SharedInterestStatus } from '../../adapters/baShareApiAdapter';
import { friendAvatarModel } from './FriendAvatar.model';

// A circular friend avatar — profile image when available, otherwise an
// initials chip on the friend accent color. Draws its model (FriendAvatar.model.ts).

type Props = {
  label: string;
  avatarUrl?: string;
  size?: number;
  // When set, overlays a small star badge at the top-right corner reflecting the
  // friend's interest: full star for will_go, half star for maybe.
  status?: SharedInterestStatus;
};

export function FriendAvatar({ label, avatarUrl, size = 22, status }: Props) {
  const model = friendAvatarModel({ label, avatarUrl, size, status });
  const radius = model.size / 2;
  // 1px white ring to lift the avatar off the background and separate stacked avatars.
  const ring = { borderWidth: 1, borderColor: colors.accent };

  const avatar =
    model.photo !== null ? (
      <ExpoImage
        source={{ uri: model.photo }}
        style={{ width: model.size, height: model.size, borderRadius: radius, ...ring }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <View
        style={{
          width: model.size,
          height: model.size,
          borderRadius: radius,
          backgroundColor: colors.friend,
          alignItems: 'center',
          justifyContent: 'center',
          ...ring,
        }}
      >
        <Text
          style={{
            fontSize: model.initialFontSize,
            color: colors.white,
            fontFamily: 'Bold-Default',
          }}
        >
          {model.initial}
        </Text>
      </View>
    );

  if (model.badge === null) {
    return avatar;
  }

  // Star badge — an outlined star (dark star behind, gold in front) so it reads
  // over both photos and the initials chip.
  const { badge } = model;
  return (
    <View style={{ width: model.size, height: model.size }}>
      {avatar}
      <View
        style={{ position: 'absolute', top: -badge.offset, right: -badge.offset, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={badge.icon} size={badge.size + 2} color={colors.background} style={{ position: 'absolute' }} />
        <Ionicons name={badge.icon} size={badge.size} color={colors.accent} />
      </View>
    </View>
  );
}
