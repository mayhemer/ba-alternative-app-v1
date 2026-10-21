import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { BOLD } from './planStyles';
import { sameProps } from './sameProps';
import type { DayTone, PlanTitleModel } from './PlanDayTitle.model';
import { colors } from '../../styling/tokens';

// ── The day title ─────────────────────────────────────────────────────────────

function toneColor(tone: DayTone): string {
  switch (tone) {
    case 'today': return colors.accent;
    case 'future': return colors.breakBlue;
    case 'past': return colors.pastDay;
    default: return colors.textPrimary;
  }
}

/** One line, centred: the weekday in capitals, then the date. Never sticky. */
function PlanDayTitleBase({ item }: { item: PlanTitleModel }) {
  const color = toneColor(item.tone);
  return (
    <View accessibilityRole="header" style={{ height: item.height, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <Text style={[BOLD, { fontSize: 18, letterSpacing: 0.7, textTransform: 'uppercase', color }]}>{item.weekday}</Text>
      <Text style={{ fontSize: 15, color }}>{item.date}</Text>
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanDayTitle = memo(PlanDayTitleBase, sameProps);
