import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DrawerActions } from '@react-navigation/native';
import { useLens, useLensPanel } from '../../context/LensContext';
import { useSocialData } from '../../context/SocialContext';
import { navigationRef } from '../../navigation/navigationRef';
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

  // The drawer and the lens panel are mutually exclusive overlays — opening the
  // panel dismisses the drawer. A no-op when the drawer is already closed, and on
  // wide screens where it is permanent. The reverse direction lives in TopBar.
  const handlePress = useCallback((): void => {
    if (!isOpen) {
      navigationRef.dispatch(DrawerActions.closeDrawer());
    }
    toggle();
  }, [isOpen, toggle]);

  return (
    <Pressable
      onPress={handlePress}
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
