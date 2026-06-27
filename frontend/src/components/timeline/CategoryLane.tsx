import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import type { ConflictOverlap } from '../../utils/conflictUtils';
import { decodeCategoryColor, dimColor } from '../../utils/color';
import { getCategoryLocalized } from '../../utils/localization';
import { CANVAS_WIDTH, LANE_HEIGHT, STRIP_HEIGHT, VIEW_OFFSET_X } from './timelineLayout';
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
  scrollX: SharedValue<number>;
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
  scrollX,
  nowX,
  getStatus,
  onBlockPress,
  laneHeight = LANE_HEIGHT,
  eventSubRows,
  conflictOverlaps,
}: Props) {
  const title = getCategoryLocalized(category.localized, 'title');
  const categoryColor = decodeCategoryColor(category.color);
  const dimmedColor   = dimColor(categoryColor, 60);

  // Translates the title right in sync with horizontal scroll so it stays
  // pinned to the left visual edge of the viewport.
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value + VIEW_OFFSET_X }],
  }));

  return (
    <View>
      {/* Title strip — spans full canvas width; label sticks to the left edge */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: STRIP_HEIGHT,
          backgroundColor: colors.timeline.stripBg,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, labelStyle]}>
          <Animated.Text
            numberOfLines={1}
            className={'font-family: default'}
            style={{
              fontSize: 14,
              //fontWeight: '300',
              fontFamily: 'Regular-Default',
              color: colors.textSecondary,
            }}
          >
            {title}
          </Animated.Text>
        </Animated.View>
      </View>

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
