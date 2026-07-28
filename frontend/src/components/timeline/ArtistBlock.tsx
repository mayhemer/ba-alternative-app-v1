import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { type InterestStatus } from '../../cache/cacheService';
import { timeToX, formatTime, BLOCK_FONT_SIZE, LANE_HEIGHT, MIN_BLOCK_WIDTH, PIXELS_PER_MS } from './timelineLayout';
import { fitFontSize } from '../../utils/textFit';
import { colors } from '../../styling/tokens';
import { dimColor } from '../../utils/color';
import { StarIndicator } from '../StarButton';
import type { ConflictOverlap } from '../../utils/conflictUtils';

// Block chrome — shared between the rendered styles and the label width maths
// below, so the two cannot drift apart.
const BLOCK_PADDING = 8;
const BLOCK_BORDER_LEFT = 3;
const STAR_SIZE = 11;

const CONFLICT_BAR_HEIGHT = 10;
const CONFLICT_BAR_RAISE = 1; // px the bar sits above the block's top edge ("over" it)
const CONFLICT_BAR_MIN_WIDTH = 4;
const CONFLICT_STRIPE = 2; // perpendicular width of each 45° dark-red band

// Horizontal spacing between stripe start points. At 45° the perpendicular gap
// is step/√2, so stepping by 2·stripe·√2 makes bands and gaps equally wide.
const CONFLICT_STRIPE_STEP = CONFLICT_STRIPE * 2 * Math.SQRT2;

/**
 * 45° hazard stripes across a w×h box, as one path of parallel segments.
 *
 * Drawn explicitly rather than with <Pattern patternTransform="rotate(45)">:
 * react-native-svg discards patternTransform on iOS — RNSVGPainter applies its
 * `_transform` only in paintLinearGradient/paintRadialGradient, never in
 * paintPattern — so the rotation never reached the tiling and the stripes came
 * out as repeating fragments. One Path keeps this to a single SVG node.
 */
function stripePath(w: number, h: number): string {
  let d = '';
  // Start a full box-height to the left so the first stripes still cross x=0.
  for (let x = -h; x < w; x += CONFLICT_STRIPE_STEP) {
    d += `M${x.toFixed(2)},${h} L${(x + h).toFixed(2)},0 `;
  }
  return d;
}

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

  const showLabel = width >= 40;

  const oneWordArtist = artist.name.indexOf(' ') === -1;

  // Title size is picked here rather than by adjustsFontSizeToFit — see
  // utils/textFit for why that prop cannot hold a floor under Fabric.
  // StarIndicator renders nothing for 'none', so its column only costs width
  // when the artist is actually marked.
  const labelLines = oneWordArtist ? 1 : 2;
  const labelWidth =
    width - BLOCK_BORDER_LEFT - BLOCK_PADDING * 2 - (status === 'none' ? 0 : STAR_SIZE);
  const labelFontSize = fitFontSize(artist.name.length, labelWidth, labelLines, BLOCK_FONT_SIZE);

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
          borderLeftWidth: BLOCK_BORDER_LEFT,
          overflow: 'hidden',
          justifyContent: 'flex-start',
          padding: BLOCK_PADDING,
        }}
      >
        {showLabel ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={labelLines}
                style={{ fontSize: labelFontSize, color: colors.textPrimary, fontFamily: 'Bold-Default' }}
              >
                {artist.name}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textPrimary }}>
                {formatTime(event.dateFrom)}–{formatTime(event.dateTo)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <StarIndicator status={status} size={STAR_SIZE} />
            </View>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Conflict markers — 45° red / dark-red striped bars laid OVER the block,
          one per overlap interval */}
      {conflictBars.map((bar) => {
        const clipId = `conflictClip-${bar.key}`;
        return (
          <Svg
            key={bar.key}
            pointerEvents="none"
            width={bar.barWidth}
            height={CONFLICT_BAR_HEIGHT}
            style={{ position: 'absolute', bottom: -CONFLICT_BAR_RAISE, left: bar.left }}
          >
            {/* The stripes start off-box on both sides so they reach the corners;
                clip them back to the bar. */}
            <Defs>
              <ClipPath id={clipId}>
                <Rect width={bar.barWidth} height={CONFLICT_BAR_HEIGHT} />
              </ClipPath>
            </Defs>
            <Rect width={bar.barWidth} height={CONFLICT_BAR_HEIGHT} fill={colors.danger} />
            <Path
              d={stripePath(bar.barWidth, CONFLICT_BAR_HEIGHT)}
              stroke={colors.dangerMuted}
              strokeWidth={CONFLICT_STRIPE}
              clipPath={`url(#${clipId})`}
            />
          </Svg>
        );
      })}
    </View>
  );
}
