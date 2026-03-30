import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import { decodeCategoryColor } from '../../utils/color';
import { getCategoryLocalized } from '../../utils/localization';
import { CANVAS_WIDTH, LANE_HEIGHT, STRIP_HEIGHT, VIEW_OFFSET_X, CATEGORY_MARKER_SIZE } from './timelineLayout';
import { ArtistBlock } from './ArtistBlock';
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
  getStatus: (artistId: string) => InterestStatus;
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
};

export function CategoryLane({
  category,
  events,
  dayStart,
  scrollX,
  getStatus,
  onBlockPress,
}: Props) {
  const title = getCategoryLocalized(category.localized, 'title');
  const categoryColor = decodeCategoryColor(category.color);

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
          <View style={{ 
              display: 'none',
              width: CATEGORY_MARKER_SIZE, height: CATEGORY_MARKER_SIZE, backgroundColor: categoryColor, marginRight: 6 
            }} />
          <Animated.Text
            numberOfLines={1}
            style={{
              fontSize: 20,
              fontWeight: '300',
              fontFamily: 'regular-default',
              color: colors.timeline.categoryName,
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
          height: LANE_HEIGHT,
          backgroundColor: colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: colors.timeline.laneBorder,
          position: 'relative',
        }}
      >
        {events.map(({ event, artist }) => (
          <ArtistBlock
            key={event.eventId}
            event={event}
            artist={artist}
            dayStart={dayStart}
            status={getStatus(artist.artistId)}
            onPress={() => onBlockPress(event, artist)}
          />
        ))}
      </View>
    </View>
  );
}
