import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { FriendFacepile } from './FriendFacepile';
import { FriendAvatar } from './FriendAvatar';
import { colors } from '../../styling/tokens';
import type { FriendPick } from '../../context/SocialContext';

// Shows which friends picked an artist: a facepile + summary line that expands
// on tap to the full avatars + names + status list. Renders nothing when empty.
export function FriendPickList({ friends }: { friends: FriendPick[] }) {
  const [expanded, setExpanded] = useState(false);
  if (friends.length === 0) { return null; }

  const summary =
    friends.length === 1
      ? `${friends[0].label} picked this`
      : `${friends.length} friends picked this`;

  return (
    <View style={{ marginTop: 10 }}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <FriendFacepile friends={friends} size={22} />
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 8, flex: 1 }} numberOfLines={1}>
          {summary}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.notInterested}
        />
      </Pressable>

      {expanded && (
        <View
          style={{
            marginTop: 26,
            marginBottom: 10,
            backgroundColor: colors.surfaceRaised,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          {friends.map((friend) => (
            <View
              key={friend.token}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              <FriendAvatar label={friend.label} avatarUrl={friend.avatarUrl} size={20} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, marginLeft: 8, flex: 1 }} numberOfLines={1}>
                {friend.label}
              </Text>
              <Ionicons
                name={friend.status === 'will_go' ? 'star' : 'star-half'}
                size={15}
                color={colors.accent}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
