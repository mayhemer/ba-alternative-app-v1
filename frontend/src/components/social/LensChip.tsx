import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DrawerActions } from '@react-navigation/native';
import { useLens, useLensPanel } from '../../context/LensContext';
import { useSocialData } from '../../context/SocialContext';
import { navigationRef } from '../../navigation/navigationRef';
import { getStarIconProps } from '../StarButton';
import { FriendAvatar } from './FriendAvatar';
import type { InterestStatus } from '../../context/InterestContext';
import type { LensScope } from '../../utils/interestUtils';
import { colors } from '../../styling/tokens';

// Layout of the two-part chip: the state indicator on the left, the menu handle
// on the right. The state slot is wider than the avatar it holds so the avatar's
// star decorator, which hangs outside its own box, keeps clear of the dots.
const STATE_SLOT = 26;
const AVATAR_SIZE = 22;
const STAR_SIZE = 20;
const DOTS_SIZE = 20;
const SLOT_GAP = 8;

// Maps a non-friend scope onto the star vocabulary shared with artist rows:
// no scope = the empty gray star, my picks = the filled gold star (half when the
// lens is narrowed to "maybe").
function scopeStarStatus(scope: LensScope): InterestStatus {
  if (scope.kind === 'all') { return 'none'; }
  if (scope.level === 'maybe') { return 'maybe'; }
  return 'must_see';
}

// TopBar entry point for the view/share lens. Reads as "state + menu": the left
// half shows which source is active (star for everything / my picks, the friend's
// avatar with a full star when focused on a friend), the right half is a
// three-dot handle. Tapping anywhere toggles the Lens panel.
export function LensChip() {
  const { scope } = useLens();
  const { toggle, isOpen } = useLensPanel();
  const { getFriend } = useSocialData();

  const friend = scope.kind === 'friend' ? getFriend(scope.token) : undefined;
  const star = getStarIconProps(scopeStarStatus(scope));

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
      style={{ flexDirection: 'row', alignItems: 'center', height: 32 }}
    >
      <View
        style={{
          width: STATE_SLOT,
          height: STATE_SLOT,
          marginRight: SLOT_GAP,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {friend !== undefined ? (
          <FriendAvatar
            label={friend.label}
            avatarUrl={friend.avatarUrl}
            size={AVATAR_SIZE}
            status="will_go"
          />
        ) : (
          <Ionicons name={star.name} size={STAR_SIZE} color={star.color} />
        )}
      </View>
      <Ionicons
        name="ellipsis-vertical"
        size={DOTS_SIZE}
        color={isOpen ? colors.accent : colors.textPrimary}
      />
    </Pressable>
  );
}
