import { strings } from '../../i18n/strings';
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
// the avatar and the ✕ — or, once armed, Cancel and Remove. Given
// `skeletonColor`, the same row as a mock for the panel's preview
// (LensPanelSkeleton): the label and the icons in that colour, the avatar a
// disc of it.

// The avatar is the tallest thing in a friend row, so it sets the row height.
// Capping the trailing action slot to the same height keeps the row from
// growing when the ✕ is swapped for the Cancel / Remove pair.
const FRIEND_AVATAR_SIZE = 22;
const LABEL_TEXT = { color: colors.textPrimary, fontSize: 15 };
const LABEL_BOX = { flex: 1 };
const FRIEND_LABEL_BOX = { flex: 1, marginLeft: 8 };
const AVATAR_DISC = { width: FRIEND_AVATAR_SIZE, height: FRIEND_AVATAR_SIZE, borderRadius: FRIEND_AVATAR_SIZE / 2 };

type Props = {
  item: LensScopeRowModel;
  /** A tap on the row: shows its source, or backs out of an armed removal. */
  onPress: (row: LensScopeRowModel) => void;
  onArm: (token: string) => void;
  onDisarm: () => void;
  onRemove: (token: string) => void;
  /** Draws the row as a loading skeleton in this colour. */
  skeletonColor?: string;
};

function LensScopeRowBase({ item, onPress, onArm, onDisarm, onRemove, skeletonColor }: Props) {
  const { friend } = item;
  const skeleton = skeletonColor !== undefined;
  const radioColor = item.active ? colors.accent : colors.notInterested;
  const labelColor = skeleton ? { color: skeletonColor } : undefined;
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
        color={skeletonColor ?? radioColor}
        style={{ marginRight: 10 }}
      />
      {friend === null ? (
        <Text style={[LABEL_TEXT, LABEL_BOX, labelColor]}>{item.label}</Text>
      ) : (
        <>
          {skeleton
            ? <View testID="skeleton-avatar" style={[AVATAR_DISC, { backgroundColor: skeletonColor }]} />
            : <FriendAvatar label={item.label} avatarUrl={friend.avatarUrl} size={FRIEND_AVATAR_SIZE} />}
          <Text numberOfLines={1} style={[LABEL_TEXT, FRIEND_LABEL_BOX, labelColor]}>
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
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{strings().lensScopeRow.cancel}</Text>
              </Pressable>
              <Pressable onPress={() => onRemove(friend.token)} hitSlop={8} style={{ paddingLeft: 10 }}>
                <Text style={{ color: colors.danger, fontSize: 13, fontFamily: 'Bold-Default' }}>
                  {strings().lensScopeRow.remove}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onArm(friend.token)}
              hitSlop={8}
              style={{ marginLeft: 10 }}
              accessibilityRole="button"
              accessibilityLabel={strings().lensScopeRow.removeFriend(item.label)}
            >
              <Ionicons name="close-circle-outline" size={20} color={skeletonColor ?? colors.notInterested} />
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const LensScopeRow = memo(LensScopeRowBase, sameProps);
