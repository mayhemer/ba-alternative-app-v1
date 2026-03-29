import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import { decodeCategoryColor } from '../../utils/color';
import { getCategoryLocalized } from '../../utils/localization';
import { CANVAS_WIDTH, LANE_HEIGHT, STRIP_HEIGHT } from './timelineLayout';
import { ArtistBlock } from './ArtistBlock';

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
  const title      = getCategoryLocalized(category.localized, 'title');
  const stripColor = decodeCategoryColor(category.color);

  // Translates the title right in sync with horizontal scroll so it stays
  // pinned to the left visual edge of the viewport.
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value }],
  }));

  return (
    <View>
      {/* Title strip — spans full canvas width; label sticks to the left edge */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: STRIP_HEIGHT,
          backgroundColor: stripColor,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.Text
          numberOfLines={1}
          style={[
            {
              fontSize: 10,
              fontWeight: '700',
              color: '#000000',
              paddingHorizontal: 6,
            },
            labelStyle,
          ]}
        >
          {title}
        </Animated.Text>
      </View>

      {/* Events row — artist blocks positioned absolutely by time offset */}
      <View
        style={{
          width: CANVAS_WIDTH,
          height: LANE_HEIGHT,
          backgroundColor: '#111111',
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
