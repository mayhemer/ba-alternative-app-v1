import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Text } from './ui/Text';
import type { InterestStatus } from '../context/InterestContext';

// ── Config ────────────────────────────────────────────────────────────────────

type StarConfig = {
  icon: string;
  color: string;
  label: string;
  feedbackLabel: string;
};

const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: '☆', color: '#555555', label: 'Not interested', feedbackLabel: '☆ Removed'          },
  maybe:    { icon: '✦', color: '#b87a1a', label: 'Maybe',          feedbackLabel: '✦ Maybe want to see' },
  must_see: { icon: '★', color: '#e8c84a', label: 'Must see',       feedbackLabel: '★ Must see!'         },
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
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityLabel={config.label}
      accessibilityRole="button"
    >
      <Text style={{ fontSize, color: config.color, lineHeight: fontSize + 4 }}>
        {config.icon}
      </Text>
    </TouchableOpacity>
  );
}

export function getFeedbackLabel(status: InterestStatus): string {
  return STAR_CONFIG[status].feedbackLabel;
}
