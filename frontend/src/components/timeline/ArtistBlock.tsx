import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import type { DbArtist, DbEvent } from '../../types/backend';
import type { InterestStatus } from '../../cache/cacheService';
import { timeToX, LANE_HEIGHT, MIN_BLOCK_WIDTH } from './timelineLayout';

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  onPress: () => void;
};

// ── Block colours per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

function blockStyle(status: InterestStatus): BlockStyle {
  switch (status) {
    case 'maybe':    return { bg: '#1f1400', border: '#b87a1a' };
    case 'must_see': return { bg: '#1f1800', border: '#e8c84a' };
    default:         return { bg: '#1a1a1a', border: '#2a2a2a' };
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
        <Text numberOfLines={2} style={{ fontSize: 10, color: '#e0e0e0', fontWeight: '500' }}>
          {artist.name}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
