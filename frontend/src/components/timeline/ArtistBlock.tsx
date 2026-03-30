import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { getCategories, type InterestStatus } from '../../cache/cacheService';
import { timeToX, formatTime, LANE_HEIGHT, MIN_BLOCK_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { decodeCategoryColor } from '../../utils/color';

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  onPress: () => void;
};

// ── Block colours per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

function blockStyle(status: InterestStatus, event: DbEvent): BlockStyle {
  const category = getCategories(event.slug).find(c => c.categoryId == event.categoryId);
  const border = decodeCategoryColor(category?.color ?? 0);
  switch (status) {
    case 'maybe':    return { bg: colors.timeline.blockWanted, border };
    case 'must_see': return { bg: colors.timeline.blockWanted, border };
    default:         return { bg: colors.timeline.blockDefault, border };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistBlock({ event, artist, dayStart, status, onPress }: Props) {
  const x     = timeToX(event.dateFrom, dayStart);
  const right = timeToX(event.dateTo,   dayStart);
  const width = Math.max(MIN_BLOCK_WIDTH, right - x);

  const { bg, border } = blockStyle(status, event);
  const showLabel = width >= 40;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        position: 'absolute',
        left: x,
        top: 2,
        width,
        height: LANE_HEIGHT - 4,
        backgroundColor: bg,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingHorizontal: 10,
      }}
    >
      {showLabel ? (
        <>
          <Text numberOfLines={1} style={{ fontSize: 10, color: colors.timeline.blockText, fontWeight: '500' }}>
            {artist.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 9, color: colors.timeline.blockText, opacity: 0.6 }}>
            {formatTime(event.dateFrom)}–{formatTime(event.dateTo)}
          </Text>
        </>
      ) : null}
    </TouchableOpacity>
  );
}
