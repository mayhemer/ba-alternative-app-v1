import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { type InterestStatus } from '../../cache/cacheService';
import { timeToX, formatTime, LANE_HEIGHT, MIN_BLOCK_WIDTH, PIXELS_PER_MS } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { dimColor } from '../../utils/color';
import { StarIndicator } from '../StarButton';
import { useSocialData } from '../../context/SocialContext';
import type { ConflictOverlap } from '../../utils/conflictUtils';

const CONFLICT_BAR_HEIGHT = 10;
const CONFLICT_BAR_RAISE = 1; // px the bar sits above the block's top edge ("over" it)
const CONFLICT_BAR_MIN_WIDTH = 4;
const CONFLICT_STRIPE = 5; // half-period of the 45° red / dark-red stripes

type Props = {
  event: DbEvent;
  artist: DbArtist;
  dayStart: number;
  status: InterestStatus;
  categoryColor: string;
  onPress: () => void;
  subRow?: number;
  conflictOverlaps?: ConflictOverlap[];
};

// ── Block colors per interest state ──────────────────────────────────────────

type BlockStyle = { bg: string; border: string };

function blockStyle(_status: InterestStatus, categoryColor: string): BlockStyle {
  const bg     = dimColor(categoryColor, 48);
  const border = dimColor(categoryColor, 128);
  return { bg, border };
}


// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistBlock({ event, artist, dayStart, status, categoryColor, onPress, subRow = 0, conflictOverlaps }: Props) {
  const x     = timeToX(event.dateFrom, dayStart);
  const right = timeToX(event.dateTo,   dayStart);
  const width = Math.max(MIN_BLOCK_WIDTH, right - x);

  const { bg, border } = blockStyle(status, categoryColor);
  const { friendsByArtist } = useSocialData();
  const pickedByFriend = friendsByArtist[artist.artistId] !== undefined;

  const showLabel = width >= 40;

  const oneWordArtist = artist.name.indexOf(' ') === -1;

  // Conflict bar geometry — one bar per overlap interval, each spanning only the
  // overlapping portion of the block (mirrors the conflict detail mini-timeline).
  const conflictBars = (conflictOverlaps ?? []).map((interval) => {
    const fromPx = (interval.from - event.dateFrom) * PIXELS_PER_MS;
    const toPx   = (interval.to   - event.dateFrom) * PIXELS_PER_MS;
    const left   = Math.max(0, Math.min(width, fromPx));
    const barWidth = Math.max(CONFLICT_BAR_MIN_WIDTH, Math.min(width, toPx) - left);
    return { key: interval.from, left, barWidth };
  });

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: 2 + subRow * LANE_HEIGHT,
        width,
        height: LANE_HEIGHT - 4,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        style={{
          flex: 1,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {pickedByFriend && (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: colors.friend,
                  }}
                />
              )}
              <StarIndicator status={status} size={11} />
            </View>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Conflict markers — 45° red / dark-red striped bars laid OVER the block,
          one per overlap interval */}
      {conflictBars.map((bar) => {
        const patternId = `conflictStripes-${bar.key}`;
        return (
          <Svg
            key={bar.key}
            pointerEvents="none"
            width={bar.barWidth}
            height={CONFLICT_BAR_HEIGHT}
            style={{ position: 'absolute', bottom: -CONFLICT_BAR_RAISE, left: bar.left }}
          >
            <Defs>
              <Pattern
                id={patternId}
                width={CONFLICT_STRIPE * 2}
                height={CONFLICT_STRIPE * 2}
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <Rect width={CONFLICT_STRIPE * 2} height={CONFLICT_STRIPE * 2} fill={colors.danger} />
                <Rect width={CONFLICT_STRIPE} height={CONFLICT_STRIPE * 2} fill={colors.dangerMuted} />
              </Pattern>
            </Defs>
            <Rect width={bar.barWidth} height={CONFLICT_BAR_HEIGHT} fill={`url(#${patternId})`} />
          </Svg>
        );
      })}
    </View>
  );
}
