import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from '../context/InterestContext';
import { isInterested } from '../utils/interestUtils';
import { colors } from '../styling/tokens';

// ── Config ────────────────────────────────────────────────────────────────────

export type StarIconName = 'star' | 'star-half' | 'star-outline';

type StarConfig = {
  icon: StarIconName;
  color: string;
  struck: boolean; // drawn with a diagonal bar across it
  feedbackLabel: string;
};

const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: 'star-outline', color: colors.notInterested, struck: false, feedbackLabel: 'Not marked'           },
  maybe:    { icon: 'star-half',    color: colors.accent,        struck: false, feedbackLabel: 'Maybe'                },
  will_go:  { icon: 'star',         color: colors.accent,        struck: false, feedbackLabel: 'Must see!'            },
  dont_go:  { icon: 'star-outline', color: colors.danger,        struck: true,  feedbackLabel: "Don't go"             },
};

// ── StarGlyph ─────────────────────────────────────────────────────────────────
// The star for a status, as the star button shows it. Ionicons has no struck-out
// star, so 'dont_go' lays a bar over the outline instead of pulling in a second
// icon font (which would have to be preloaded behind the splash, see fonts.ts).
// Every other status stays a bare glyph — the shape every artist row renders.

type GlyphProps = {
  status: InterestStatus;
  size: number;
  color?: string; // overrides the status colour, shape only
};

export function StarGlyph({ status, size, color }: GlyphProps) {
  const config = STAR_CONFIG[status];
  const tint = color ?? config.color;
  const glyph = <Ionicons name={config.icon} size={size} color={tint} />;
  if (!config.struck) { return glyph; }

  // The wrapper takes the glyph's own size: the glyph is text, and its line box
  // is taller than `size`, so a fixed size would make this star shorter than the
  // bare ones and shift whatever is laid out around the button. The bar is
  // placed on the size × size square the glyph is drawn in, at the top of that
  // box — not on the box's centre, which sits below the star's.
  const barLength = Math.round(size * 1.1);
  const barThickness = Math.max(2, Math.round(size * 0.08));
  return (
    <View>
      {glyph}
      <View
        testID="star-strike"
        style={{
          position: 'absolute',
          left: (size - barLength) / 2,
          top: (size - barThickness) / 2,
          width: barLength,
          height: barThickness,
          borderRadius: barThickness / 2,
          backgroundColor: tint,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

// ── StarIndicator ─────────────────────────────────────────────────────────────
// Small non-interactive indicator shown next to artist names in lists/sheets.
// Renders nothing unless the artist is a pick ('none' and 'dont_go').

type IndicatorProps = {
  status: InterestStatus;
  size?: number;
};

export function StarIndicator({ status, size = 14 }: IndicatorProps) {
  if (!isInterested(status)) { return null; }
  const config = STAR_CONFIG[status];
  return <Ionicons name={config.icon} size={size} color={config.color} />;
}

// ── StarButton ────────────────────────────────────────────────────────────────

const STAR_ICON_SIZE = { small: 26, large: 32 } as const;
const STAR_HIT_SLOP  = { small: 25, large: 5 } as const;

/**
 * How far from the right edge of the content column a star button (with its
 * hit slop) can reach. Overlays that must never cover a star keep out of it.
 *   artist row:    pr-4 (16) + small icon + slop                        = 67
 *   detail header: contentPadding (16) + large icon + slop + web ✕ (30) = 83
 */
export const STAR_COLUMN_RESERVE = Math.max(
  16 + STAR_ICON_SIZE.small + STAR_HIT_SLOP.small,
  16 + STAR_ICON_SIZE.large + STAR_HIT_SLOP.large + 30,
);

type Props = {
  status: InterestStatus;
  onPress: () => void;
  label: string;
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, label, size = 'small' }: Props) {
  const iconSize = STAR_ICON_SIZE[size];
  const slop = STAR_HIT_SLOP[size];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={slop}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <StarGlyph status={status} size={iconSize} />
    </Pressable>
  );
}

export function getFeedbackLabel(status: InterestStatus): string {
  return STAR_CONFIG[status].feedbackLabel;
}

/** Returns the icon name and color for a given interest status. Used by filter controls. */
export function getStarIconProps(status: InterestStatus): { name: StarIconName; color: string } {
  const c = STAR_CONFIG[status];
  return { name: c.icon, color: c.color };
}
