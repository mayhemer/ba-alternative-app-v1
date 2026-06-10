import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { type InterestStatus } from '../../cache/cacheService';
import { timeToX, formatTime, LANE_HEIGHT, MIN_BLOCK_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { dimColor } from '../../utils/color';
import { Exclamation } from '../ui/Exclamation';
import { StarIndicator } from '../StarButton';

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  categoryColor: string;
  onPress: () => void;
  subRow?: number;
  hasConflict: boolean;
};

// ── Block colors per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

function blockStyle(_status: InterestStatus, categoryColor: string): BlockStyle {
  const bg     = dimColor(categoryColor, 48);
  const border = dimColor(categoryColor, 128);
  return { bg, border };
}


// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistBlock({ event, artist, dayStart, status, categoryColor, onPress, subRow = 0, hasConflict }: Props) {
  const x     = timeToX(event.dateFrom, dayStart);
  const right = timeToX(event.dateTo,   dayStart);
  const width = Math.max(MIN_BLOCK_WIDTH, right - x);

  const { bg, border } = blockStyle(status, categoryColor);

  const showLabel = width >= 40;

  const oneWordArtist = artist.name.indexOf(' ') === -1;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        left: x,
        top: 2 + subRow * LANE_HEIGHT,
        width,
        height: LANE_HEIGHT - 4,
        backgroundColor: bg,
        borderColor: border,
        borderLeftWidth: 3,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        padding: 8,
      }}
    >
      {showLabel ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={oneWordArtist ? 1 : 2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ fontSize: 12, color: colors.textPrimary, fontFamily: 'Bold-Default' }}
            >
              {artist.name}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textPrimary }}>
              {formatTime(event.dateFrom)}–{formatTime(event.dateTo)}
            </Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            <StarIndicator status={status} size={11} />
            {hasConflict && <Exclamation/>}
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
