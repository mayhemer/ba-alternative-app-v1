import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PanelSkeletonCard } from '../../../ui/PanelSkeletonCard';
import type { PullPreview } from '../../../ui/PullPreview';
import { colors } from '../../../styling/tokens';
import { planFilterSkeletonModel } from './PlanFilterSkeleton.model';
import { FILTER_PANEL_PADDING, LEVEL_BUTTON_HEIGHT, LEVEL_BUTTON_RADIUS, LEVEL_GAP, LEVEL_ICON_SIZE } from './PlanFilterLevel.model';

// ── The filter panel's preview, drawn ─────────────────────────────────────────
//
// Draws its model (PlanFilterSkeleton.model.ts): the card and the four button
// outlines with their glyphs.

const ROW = { flexDirection: 'row' as const, gap: LEVEL_GAP };
const PADDING = { padding: FILTER_PANEL_PADDING };
const BUTTON = {
  flex: 1,
  height: LEVEL_BUTTON_HEIGHT,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderRadius: LEVEL_BUTTON_RADIUS,
  borderWidth: 1,
  borderColor: colors.borderMid,
};

function PlanFilterSkeletonBase({ armed }: { armed: boolean }) {
  const model = planFilterSkeletonModel(armed);
  return (
    <PanelSkeletonCard
      height={model.cardHeight}
      borderColor={model.borderColor}
      padding={PADDING}
    >
      <View testID="plan-filter-skeleton" style={ROW}>
        {model.glyphs.map((glyph) => (
          <View key={glyph.icon} style={BUTTON}>
            <Ionicons name={glyph.icon} size={LEVEL_ICON_SIZE} color={glyph.color} />
          </View>
        ))}
      </View>
    </PanelSkeletonCard>
  );
}

/** What a pull down past My plan's top shows (ui/PullPreview). */
export const PlanFilterSkeleton: PullPreview = PlanFilterSkeletonBase;
