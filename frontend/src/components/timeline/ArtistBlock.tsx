import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import type { DbArtist, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import { timeToX, LANE_HEIGHT, MIN_BLOCK_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  onPress: () => void;
};

// ── Block colours per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

const blockBackground = colors.muted;
const blockBorder = blockBackground;
const blockTextColor = colors.white;

function blockStyle(status: InterestStatus): BlockStyle {
  const bg = blockBackground;
  const border = blockBorder;
  switch (status) {
    case 'maybe':    return { bg, border };
    case 'must_see': return { bg, border };
    default:         return { bg, border };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistBlock({ event, artist, dayStart, status, onPress }: Props) {
  const x     = timeToX(event.dateFrom, dayStart);
  const right = timeToX(event.dateTo,   dayStart);
  const width = Math.max(MIN_BLOCK_WIDTH, right - x);

  const { bg, border } = blockStyle(status);
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
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingHorizontal: 4,
      }}
    >
      {showLabel ? (
        <Text numberOfLines={2} style={{ fontSize: 10, color: blockTextColor, fontWeight: '500' }}>
          {artist.name}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
