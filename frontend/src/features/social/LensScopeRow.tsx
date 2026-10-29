import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { FriendAvatar } from './FriendAvatar';
import { sameProps } from '../../ui/sameProps';
import type { LensScopeRowModel } from './LensPanel.model';
import { colors } from '../../styling/tokens';

// ── One source in the lens panel ──────────────────────────────────────────────
//
// Draws its model (LensPanel.model.ts): a radio, the label, and for a friend
// the avatar and the ✕ — or, once armed, Cancel and Remove.

// The avatar is the tallest thing in a friend row, so it sets the row height.
// Capping the trailing action slot to the same height keeps the row from
// growing when the ✕ is swapped for the Cancel / Remove pair.
const FRIEND_AVATAR_SIZE = 22;

type Props = {
  item: LensScopeRowModel;
  /** A tap on the row: shows its source, or backs out of an armed removal. */
  onPress: (row: LensScopeRowModel) => void;
  onArm: (token: string) => void;
  onDisarm: () => void;
  onRemove: (token: string) => void;
};

function LensScopeRowBase({ item, onPress, onArm, onDisarm, onRemove }: Props) {
  const { friend } = item;
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: item.active ? colors.surfaceRaised : 'transparent',
      }}
    >
      <Ionicons
        name={item.active ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={item.active ? colors.accent : colors.notInterested}
        style={{ marginRight: 10 }}
      />
      {friend === null ? (
        <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>{item.label}</Text>
      ) : (
        <>
          <FriendAvatar label={item.label} avatarUrl={friend.avatarUrl} size={FRIEND_AVATAR_SIZE} />
          <Text
            numberOfLines={1}
            style={{ color: colors.textPrimary, fontSize: 15, flex: 1, marginLeft: 8 }}
          >
            {item.label}
          </Text>
          {friend.confirming ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: FRIEND_AVATAR_SIZE,
              }}
            >
              <Pressable onPress={onDisarm} hitSlop={8} style={{ paddingHorizontal: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onRemove(friend.token)} hitSlop={8} style={{ paddingLeft: 10 }}>
                <Text style={{ color: colors.danger, fontSize: 13, fontFamily: 'Bold-Default' }}>
                  Remove
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onArm(friend.token)}
              hitSlop={8}
              style={{ marginLeft: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.label}`}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.notInterested} />
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const LensScopeRow = memo(LensScopeRowBase, sameProps);
