import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../../utils/conflictUtils';
import { decodeCategoryColor } from '../../utils/color';
import {
  CANVAS_WIDTH,
  LANE_BORDER_WIDTH,
  LANE_HEIGHT,
  MIN_BLOCK_WIDTH,
  stripHeightFor,
  timeToX,
} from './timelineLayout';
import { ArtistBlock } from './ArtistBlock';
import { NowLine } from './NowLine';
import { colors } from '../../styling/tokens';

export type LaneEvent = {
  event: DbEvent;
  artist: DbArtist;
};

// Shared empty list so a lane outside the mount window keeps a stable `events`
// identity across renders.
const NO_EVENTS: LaneEvent[] = [];

type Props = {
  category: DbCategory;
  events: LaneEvent[];
  dayStart: number;
  nowX: SharedValue<number>;
  getStatus: (artistId: string) => InterestStatus;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
  /** Gap between repeated labels on long blocks; scales with the viewport. */
  labelRepeat: number;
  laneHeight?: number;
  /** Landscape: no strip is reserved, the title is drawn behind this lane instead. */
  overlayTitles: boolean;
  eventSubRows?: Record<string, number>;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
  /** False while this lane is outside the vertical mount window — see TimelineView. */
  mountEvents: boolean;
  /** Canvas-X span currently mounted; blocks clear of it are left out. */
  mountFromX: number;
  mountToX: number;
};

function CategoryLaneBase({
  category,
  events,
  dayStart,
  nowX,
  getStatus,
  onBlockPress,
  labelRepeat,
  laneHeight = LANE_HEIGHT,
  overlayTitles,
  eventSubRows,
  conflictOverlaps,
  mountEvents,
  mountFromX,
  mountToX,
}: Props) {
  const categoryColor = decodeCategoryColor(category.color);
  const stripHeight = stripHeightFor(overlayTitles);

  // Only the blocks inside the mount window are rendered. The lane keeps its
  // full height either way — that comes from laneHeight, not from the blocks —
  // so nothing reflows as the window grows.
  const mountedEvents = mountEvents
    ? events.filter(({ event }) => {
        const left  = timeToX(event.dateFrom, dayStart);
        const right = Math.max(left + MIN_BLOCK_WIDTH, timeToX(event.dateTo, dayStart));
        return right >= mountFromX && left <= mountToX;
      })
    : NO_EVENTS;

  return (
    <View>
      {/* Title strip — a spacer, nothing more. The title itself is drawn by
          LaneLabelOverlay, outside the horizontal scroller, so that it can stay
          pinned to the left edge without being animated against the scroll; the
          band's colour comes from the wrapper the overlay shares with this
          scroller. In landscape the strip collapses to zero and the title moves
          behind the events row below. */}
      <View style={{ width: CANVAS_WIDTH, height: stripHeight }} />

      {/* Events row — artist blocks positioned absolutely by time offset.
          Transparent on purpose: the titles are painted beneath this layer. */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: laneHeight,
          borderBottomWidth: LANE_BORDER_WIDTH,
          borderBottomColor: colors.timeline.laneBorder,
          position: 'relative',
        }}
      >
        <NowLine nowX={nowX} canvasHeight={stripHeight + laneHeight} top={-stripHeight} />
        {mountedEvents.map(({ event, artist }) => (
          <ArtistBlock
            key={event.eventId}
            event={event}
            artist={artist}
            dayStart={dayStart}
            status={getStatus(artist.artistId)}
            categoryColor={categoryColor}
            labelRepeat={labelRepeat}
            onPress={onBlockPress}
            subRow={eventSubRows?.[event.eventId]}
            conflictOverlaps={conflictOverlaps.get(event.eventId)}
          />
        ))}
      </View>
    </View>
  );
}

// Memoised so that growing the mount window only re-renders the lanes whose
// block set actually changed, and so a star toggle — which hands down a new
// getStatus — costs one shallow compare per block instead of a full re-render.
export const CategoryLane = React.memo(CategoryLaneBase);
