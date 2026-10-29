import React from 'react';
import { Pressable, View, type AccessibilityState } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// ── A "state + ⋮" chip in the top bar ─────────────────────────────────────────
//
// The frame the lens chip (Artists, Program) and My plan's filter chip share:
// the state glyph on the left, a three-dot handle right against it. One frame,
// so both chips look alike and leave the same room right of the now pill.

/** Fits a 22 pt friend avatar or a 20 pt star. */
const STATE_SLOT = 24;
const DOTS_SIZE = 20;
/**
 * The ellipsis glyph's dots are a narrow column in the middle of its 20 pt box,
 * so the box is centred in a narrower slot. 14 pt keeps the dots about 2 pt
 * clear of a friend avatar's star badge, which hangs 4 pt past the avatar.
 */
const DOTS_SLOT = 14;
const CHIP_HEIGHT = 32;

const CHIP_STYLE = { flexDirection: 'row' as const, alignItems: 'center' as const, height: CHIP_HEIGHT };
const STATE_STYLE = { width: STATE_SLOT, height: STATE_SLOT, alignItems: 'center' as const, justifyContent: 'center' as const };
const DOTS_STYLE = { width: DOTS_SLOT, alignItems: 'center' as const };

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  dotsColor: string;
  /** The state glyph: a star, an icon or a friend's avatar. */
  children: React.ReactNode;
};

export function TopBarChip({ onPress, accessibilityLabel, accessibilityState, dotsColor, children }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={CHIP_STYLE}
    >
      <View testID="topbar-chip-state" style={STATE_STYLE}>{children}</View>
      <View testID="topbar-chip-dots" style={DOTS_STYLE}>
        <Ionicons name="ellipsis-vertical" size={DOTS_SIZE} color={dotsColor} />
      </View>
    </Pressable>
  );
}
