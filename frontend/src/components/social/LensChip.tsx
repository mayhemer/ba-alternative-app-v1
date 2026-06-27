import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLens, useLensPanel } from '../../context/LensContext';
import { useSocialData } from '../../context/SocialContext';
import { FriendAvatar } from './FriendAvatar';
import { colors } from '../../styling/tokens';

// TopBar entry point for the view/share lens. Shows the current source (a friend
// avatar when focused on a friend, otherwise a people icon) with a small gold
// star badge when a level filter is active. Tapping toggles the Lens panel.
export function LensChip() {
  const { scope } = useLens();
  const { toggle, isOpen } = useLensPanel();
  const { getFriend } = useSocialData();

  const friend = scope.kind === 'friend' ? getFriend(scope.token) : undefined;
  const levelActive = scope.kind !== 'all' && scope.level !== null;
  const iconTint = scope.kind === 'me' ? colors.accent : colors.textPrimary;

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="View and share schedules"
      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
    >
      {friend !== undefined ? (
        <FriendAvatar label={friend.label} avatarUrl={friend.avatarUrl} size={26} />
      ) : (
        <Ionicons
          name={isOpen ? 'people-circle' : 'people-circle-outline'}
          size={28}
          color={iconTint}
        />
      )}
      {levelActive && (
        <View style={{ position: 'absolute', top: -1, right: -1 }}>
          <Ionicons
            name={scope.level === 'must_see' ? 'star' : 'star-half'}
            size={12}
            color={colors.accent}
          />
        </View>
      )}
    </Pressable>
  );
}
