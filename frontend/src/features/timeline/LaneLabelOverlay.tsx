import React from 'react';
import { View } from 'react-native';
import { LaneTitle } from './LaneTitle';
import type { LaneTitleModel } from './CategoryLane.model';

type Props = {
  /** One per shown lane, from the day's model (TimelineDay.model.ts). */
  titles: LaneTitleModel[];
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
 * Being outside the lanes, it cannot derive its positions from layout, so each
 * title's place comes from the day's model, the same accumulation that produces
 * the lanes and the canvas height.
 *
 * It renders *before* the horizontal scroller, i.e. beneath the lanes, which is
 * what lets landscape drop the strip entirely and put the title behind the events
 * row: the strip and the events row are both transparent, so the title shows
 * through and the blocks are drawn over it. In portrait the title still has a
 * strip of its own and nothing overlaps it, so the ordering makes no visible
 * difference there. The lane band's colour lives on the wrapper View this shares
 * with the horizontal scroller — see TimelineView.
 */
function LaneLabelOverlayBase({ titles }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {titles.map((title) => <LaneTitle key={title.key} item={title} />)}
    </View>
  );
}

// The titles come from the day's model, so this only re-renders when the lane
// stack itself changes — not once per progressive-mount step.
export const LaneLabelOverlay = React.memo(LaneLabelOverlayBase);
