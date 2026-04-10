import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from '../context/InterestContext';
import { colors } from '../styling/tokens';

// ── Config ────────────────────────────────────────────────────────────────────

export type StarIconName = 'star' | 'star-half' | 'star-outline';

type StarConfig = {
  icon: StarIconName;
  color: string;
  feedbackLabel: string;
};

const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: 'star-outline', color: colors.notInterested, feedbackLabel: 'Removed from favorites' },
  maybe:    { icon: 'star-half',    color: colors.accent,        feedbackLabel: 'Maybe want to see'      },
  must_see: { icon: 'star',         color: colors.accent,        feedbackLabel: 'Must see!'              },
};

// ── StarIndicator ─────────────────────────────────────────────────────────────
// Small non-interactive indicator shown next to artist names in lists/sheets.
// Renders nothing for 'none'.

type IndicatorProps = {
  status: InterestStatus;
  size?: number;
};

export function StarIndicator({ status, size = 14 }: IndicatorProps) {
  if (status === 'none') { return null; }
  const config = STAR_CONFIG[status];
  return <Ionicons name={config.icon} size={size} color={config.color} />;
}

// ── StarButton ────────────────────────────────────────────────────────────────

type Props = {
  status: InterestStatus;
  onPress: () => void;
  label: string;
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, label, size = 'small' }: Props) {
  const config = STAR_CONFIG[status];
  const iconSize = size === 'large' ? 32 : 26;
  const slop = size === 'large' ? 5 : 25;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={slop}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
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
