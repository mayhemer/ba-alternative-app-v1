import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbEvent } from '../../types/backend';
import { CANVAS_WIDTH, LANE_BORDER_WIDTH } from './timelineLayout';
import { ArtistBlock } from './ArtistBlock';
import { artistBlockModel, blockSpan } from './ArtistBlock.model';
import type { CategoryLaneModel } from './CategoryLane.model';
import { NowLine } from './NowLine';
import { sameProps } from '../../ui/sameProps';
import { colors } from '../../styling/tokens';

// ── A category lane ───────────────────────────────────────────────────────────
//
// Draws its model (CategoryLane.model.ts): the title strip's space and the
// events row, with a block per set inside the mount window. The title itself is
// drawn by LaneLabelOverlay, outside the horizontal scroller.

type Props = {
  item: CategoryLaneModel;
  dayStart: number;
  nowX: SharedValue<number>;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
  /** Gap between repeated labels on long blocks; scales with the viewport. */
  labelRepeat: number;
  /** False while this lane is outside the vertical mount window — see TimelineView. */
  mountEvents: boolean;
  /** Canvas-X span currently mounted; blocks clear of it are left out. */
  mountFromX: number;
  mountToX: number;
};

function CategoryLaneBase({ item, dayStart, nowX, onBlockPress, labelRepeat, mountEvents, mountFromX, mountToX }: Props) {
  // Only the blocks inside the mount window are rendered. The lane keeps its
  // full height either way — that comes from its model, not from the blocks —
  // so nothing reflows as the window grows.
  const blocks = mountEvents
    ? item.sets.filter(({ event }) => {
        const { left, width } = blockSpan(event, dayStart);
        return left + width >= mountFromX && left <= mountToX;
      })
    : [];

  return (
    <View>
      {/* Title strip — a spacer, nothing more. The title itself is drawn by
          LaneLabelOverlay, outside the horizontal scroller, so that it can stay
          pinned to the left edge without being animated against the scroll; the
          band's colour comes from the wrapper the overlay shares with this
          scroller. In landscape the strip collapses to zero and the title moves
          behind the events row below. */}
      <View style={{ width: CANVAS_WIDTH, height: item.stripHeight }} />

      {/* Events row — artist blocks positioned absolutely by time offset.
          Transparent on purpose: the titles are painted beneath this layer. */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: item.height,
          borderBottomWidth: LANE_BORDER_WIDTH,
          borderBottomColor: colors.timeline.laneBorder,
          position: 'relative',
        }}
      >
        <NowLine nowX={nowX} canvasHeight={item.stripHeight + item.height} top={-item.stripHeight} />
        {blocks.map((set) => (
          <ArtistBlock
            key={set.event.eventId}
            item={artistBlockModel({
              event: set.event,
              artist: set.artist,
              dayStart,
              status: set.status,
              categoryColor: item.color,
              labelRepeat,
              subRow: set.subRow,
              overlaps: set.overlaps,
            })}
            onPress={onBlockPress}
          />
        ))}
      </View>
    </View>
  );
}

// Renders again only when its model or the mount window changes: growing the
// window re-renders only the lanes whose block set changed, and a pick or a
// lens change only the lanes whose sets it touched.
export const CategoryLane = React.memo(CategoryLaneBase, sameProps);
