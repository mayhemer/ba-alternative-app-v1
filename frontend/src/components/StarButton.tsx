import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from '../context/InterestContext';
import { colors } from '../styling/tokens';

// ── Config ────────────────────────────────────────────────────────────────────

const HIT_SLOP = 24;

type StarConfig = {
  icon: 'star' | 'star-half' | 'star-outline';
  color: string;
  label: string;
  feedbackLabel: string;
};

const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: 'star-outline', color: colors.notInterested,   label: 'Not interested', feedbackLabel: 'Removed from favorites' },
  maybe:    { icon: 'star-half', color: colors.accent,  label: 'Maybe',          feedbackLabel: 'Maybe want to see'      },
  must_see: { icon: 'star',   color: colors.accent,  label: 'Must see',       feedbackLabel: 'Must see!'              },
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
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, size = 'small' }: Props) {
  const config = STAR_CONFIG[status];
  const iconSize = size === 'large' ? 32 : 26;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP }}
      accessibilityLabel={config.label}
      accessibilityRole="button"
    >
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
    </Pressable>
  );
}

export function getFeedbackLabel(status: InterestStatus): string {
  return STAR_CONFIG[status].feedbackLabel;
}
