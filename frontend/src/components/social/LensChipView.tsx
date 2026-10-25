import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FriendAvatar } from './FriendAvatar';
import { sameProps } from '../sameProps';
import type { LensChipModel } from './LensChip.model';

// ── The lens chip, drawn ──────────────────────────────────────────────────────
//
// Draws its model (LensChip.model.ts). The state slot is wider than the avatar
// it holds so the avatar's star badge, which hangs outside its own box, keeps
// clear of the dots.

const STATE_SLOT = 26;
const AVATAR_SIZE = 22;
const STAR_SIZE = 20;
const DOTS_SIZE = 20;
const SLOT_GAP = 8;

function LensChipViewBase({ item, onPress }: { item: LensChipModel; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
        {item.state.kind === 'friend' ? (
          <FriendAvatar label={item.state.label} avatarUrl={item.state.avatarUrl} size={AVATAR_SIZE} status="will_go" />
        ) : (
          <Ionicons name={item.state.icon} size={STAR_SIZE} color={item.state.color} />
        )}
      </View>
      <Ionicons name="ellipsis-vertical" size={DOTS_SIZE} color={item.dotsColor} />
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const LensChipView = memo(LensChipViewBase, sameProps);
