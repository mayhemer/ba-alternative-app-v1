import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { getCategories, type InterestStatus } from '../../cache/cacheService';
import { timeToX, formatTime, LANE_HEIGHT, MIN_BLOCK_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { decodeCategoryColor, dimColor } from '../../utils/color';
import { getArtistLocalized } from '../../utils/localization';

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  onPress: () => void;
};

// ── Block colours per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

function blockStyle(status: InterestStatus, categoryColor: string): BlockStyle {
  const wanted = false; // status === 'maybe' || status === 'must_see';
  const bg = dimColor(categoryColor, wanted ? 96 : 48); 
  const border = dimColor(categoryColor, wanted ? 255 : 128); 
  return { bg, border };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistBlock({ event, artist, dayStart, status, onPress }: Props) {
  const x     = timeToX(event.dateFrom, dayStart);
  const right = timeToX(event.dateTo,   dayStart);
  const width = Math.max(MIN_BLOCK_WIDTH, right - x);

  const category = getCategories(event.slug).find(c => c.categoryId === event.categoryId);
  const categoryColor = decodeCategoryColor(category?.color ?? colors.timeline.blockDefault);

  const { bg, border } = blockStyle(status, categoryColor);

  const showLabel = width >= 40;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        left: x,
        top: 2,
        width,
        height: LANE_HEIGHT - 4,
        backgroundColor: bg,
        borderColor: border,
        borderLeftWidth: 3,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        padding: 10,
      }}
    >
      {showLabel ? (
        <>
          <Text numberOfLines={2} style={{ fontSize: 12, color: colors.timeline.blockText, fontFamily: 'Bold-Default' }}>
            {artist.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 10, color: colors.timeline.blockText }}>
            {formatTime(event.dateFrom)}–{formatTime(event.dateTo)}
          </Text>
        </>
      ) : null}
    </TouchableOpacity>
  );
}
