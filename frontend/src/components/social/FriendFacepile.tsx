import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { FriendAvatar } from './FriendAvatar';
import { colors } from '../../styling/tokens';
import type { FriendPick } from '../../context/SocialContext';

const MAX_AVATARS = 3;
const OVERLAP = 8; // px each avatar overlaps the previous one

type Props = {
  friends: FriendPick[];
  size?: number;
};

// A horizontal stack of friend avatars (overlapping), capped at MAX_AVATARS with
// a "+N" chip when more friends picked the same artist. Renders nothing when empty.
export function FriendFacepile({ friends, size = 22 }: Props) {
  if (friends.length === 0) { return null; }

  const shown = friends.slice(0, MAX_AVATARS);
  const extra = friends.length - shown.length;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((friend, index) => (
        <View key={friend.token} style={{ marginLeft: index === 0 ? 0 : -OVERLAP }}>
          <FriendAvatar
            label={friend.label}
            avatarUrl={friend.avatarUrl}
            size={size}
            ringColor={colors.surface}
          />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -OVERLAP,
            height: size,
            minWidth: size,
            paddingHorizontal: 4,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1.5,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: Math.round(size * 0.4), color: colors.textSecondary }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}
