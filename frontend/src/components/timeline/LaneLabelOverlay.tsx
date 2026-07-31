import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import type { DbCategory } from '../../types/backend';
import { getCategoryLocalized } from '../../utils/localization';
import { LANE_HEIGHT, STRIP_HEIGHT } from './timelineLayout';
import { colors } from '../../styling/tokens';

// Distance from the viewport's left edge, matching the strip's old padding.
const LABEL_INSET = 8;

// Landscape only: keeps the title off the lane's top border, just above where
// blocks start (ArtistBlock insets them by 2).
const OVERLAY_LABEL_TOP = 4;

type Props = {
  categories: DbCategory[];
  /** categoryId → Y of that lane's title strip, from useTimelineData. */
  laneOffsets: Record<string, number>;
  /** categoryId → height of that lane's events row, from useTimelineData. */
  laneHeights: Record<string, number>;
  /** Landscape: no strip exists, so the title spans the lane it belongs to. */
  overlayTitles: boolean;
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
 *
 * It renders *before* the horizontal scroller, i.e. beneath the lanes, which is
 * what lets landscape drop the strip entirely and put the title behind the events
 * row: the strip and the events row are both transparent, so the title shows
 * through and the blocks are drawn over it. In portrait the title still has a
 * strip of its own and nothing overlaps it, so the ordering makes no visible
 * difference there. The lane band's colour lives on the wrapper View this shares
 * with the horizontal scroller — see TimelineView.
 */
function LaneLabelOverlayBase({ categories, laneOffsets, laneHeights, overlayTitles }: Props) {
  const titleFontSize = overlayTitles ? 16 : 14;
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
            height: overlayTitles
              ? (laneHeights[category.categoryId] ?? LANE_HEIGHT)
              : STRIP_HEIGHT,
            justifyContent: overlayTitles ? 'flex-start' : 'center',
            paddingTop: overlayTitles ? OVERLAY_LABEL_TOP : 0,
            paddingHorizontal: LABEL_INSET,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: titleFontSize, color: colors.textSecondary }}
          >
            {getCategoryLocalized(category.localized, 'title')}
          </Text>
        </View>
      ))}
    </View>
  );
}

// The lane props come from useTimelineData memos, so this only re-renders when the
// lane stack itself changes — not once per progressive-mount step.
export const LaneLabelOverlay = React.memo(LaneLabelOverlayBase);
