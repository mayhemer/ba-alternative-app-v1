import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../../utils/conflictUtils';
import { decodeCategoryColor } from '../../utils/color';
import { CANVAS_WIDTH, LANE_HEIGHT, STRIP_HEIGHT } from './timelineLayout';
import { ArtistBlock } from './ArtistBlock';
import { NowLine } from './NowLine';
import { colors } from '../../styling/tokens';

export type LaneEvent = {
  event: DbEvent;
  artist: DbArtist;
};

type Props = {
  category: DbCategory;
  events: LaneEvent[];
  dayStart: number;
  nowX: SharedValue<number>;
  getStatus: (artistId: string) => InterestStatus;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
  laneHeight?: number;
  eventSubRows?: Record<string, number>;
  conflictOverlaps: Map<string, ConflictOverlap[]>;
};

export function CategoryLane({
  category,
  events,
  dayStart,
  nowX,
  getStatus,
  onBlockPress,
  laneHeight = LANE_HEIGHT,
  eventSubRows,
  conflictOverlaps,
}: Props) {
  const categoryColor = decodeCategoryColor(category.color);

  return (
    <View>
      {/* Title strip — background only. The title itself is drawn by
          LaneLabelOverlay, outside the horizontal scroller, so that it can stay
          pinned to the left edge without being animated against the scroll. */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: STRIP_HEIGHT,
          backgroundColor: colors.timeline.stripBg,
        }}
      />

      {/* Events row — artist blocks positioned absolutely by time offset */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: laneHeight,
          backgroundColor: colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: colors.timeline.laneBorder,
          position: 'relative',
        }}
      >
        <NowLine nowX={nowX} canvasHeight={STRIP_HEIGHT + laneHeight} top={-STRIP_HEIGHT} />
        {events.map(({ event, artist }) => (
          <ArtistBlock
            key={event.eventId}
            event={event}
            artist={artist}
            dayStart={dayStart}
            status={getStatus(artist.artistId)}
            categoryColor={categoryColor}
            onPress={() => onBlockPress(event, artist)}
            subRow={eventSubRows?.[event.eventId]}
            conflictOverlaps={conflictOverlaps.get(event.eventId)}
          />
        ))}
      </View>
    </View>
  );
}
