import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import type { DbCategory } from '../../types/backend';
import { getCategoryLocalized } from '../../utils/localization';
import { STRIP_HEIGHT } from './timelineLayout';
import { colors } from '../../styling/tokens';

// Distance from the viewport's left edge, matching the strip's old padding.
const LABEL_INSET = 8;

type Props = {
  categories: DbCategory[];
  /** categoryId → Y of that lane's title strip, from useTimelineData. */
  laneOffsets: Record<string, number>;
};

/**
 * Category titles, pinned to the left edge of the timeline viewport.
 *
 * Rendered as a sibling of the horizontal scroller rather than inside it, which
 * is what makes them stay put: they are simply not in the layer that scrolls
 * horizontally, so nothing has to be animated to hold them in place. The
 * previous approach counter-translated each title against `scrollX`, and since
 * every Reanimated route to the scroll offset reads sampled scroll *events*, the
 * correction always landed a frame behind the content — visible as jitter, worst
 * on web and slow devices.
 *
 * Being outside the lanes, it cannot derive its positions from layout, so the
 * strip offsets come from useTimelineData, which owns the same accumulation that
 * produces canvasHeight.
 */
function LaneLabelOverlayBase({ categories, laneOffsets }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {categories.map((category) => (
        <View
          key={category.categoryId}
          style={{
            position: 'absolute',
            top: laneOffsets[category.categoryId] ?? 0,
            left: 0,
            right: 0,
            height: STRIP_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: LABEL_INSET,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, color: colors.textSecondary }}
          >
            {getCategoryLocalized(category.localized, 'title')}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Both props come from useTimelineData memos, so this only re-renders when the
// lane stack itself changes — not once per progressive-mount step.
export const LaneLabelOverlay = React.memo(LaneLabelOverlayBase);
