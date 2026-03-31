import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './ui/Text';
import type { InterestStatus } from '../context/InterestContext';

// ── Config ────────────────────────────────────────────────────────────────────

const HIT_SLOP = 24;

type StarConfig = {
  icon: string;
  color: string;
  label: string;
  feedbackLabel: string;
};

const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: '☆', color: '#555555', label: 'Not interested', feedbackLabel: 'Removed from favorites' },
  maybe:    { icon: '☆', color: '#e8c84a', label: 'Maybe',          feedbackLabel: 'Maybe want to see' },
  must_see: { icon: '★', color: '#e8c84a', label: 'Must see',       feedbackLabel: 'Must see!'         },
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  status: InterestStatus;
  onPress: () => void;
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, size = 'small' }: Props) {
  const config = STAR_CONFIG[status];
  const fontSize = size === 'large' ? 28 : 20;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP }}
      accessibilityLabel={config.label}
      accessibilityRole="button"
    >
      <Text style={{ fontSize, color: config.color, lineHeight: fontSize + 4 }}>
        {config.icon}
      </Text>
    </Pressable>
  );
}

export function getFeedbackLabel(status: InterestStatus): string {
  return STAR_CONFIG[status].feedbackLabel;
}
