import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';
import { StarIndicator } from '../StarButton';
import { sameProps } from '../sameProps';
import { BLOCK_LAYOUT, type ArtistBlockModel, type BlockLabelModel } from './ArtistBlock.model';

// ── A set's block on the timeline ─────────────────────────────────────────────
//
// Draws its model (ArtistBlock.model.ts): the box at its time and row, the
// label (repeated along a long block), the star, and the conflict bars.

export const CONFLICT_STRIPE = 2; // perpendicular width of each 45° dark-red band

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
export function stripePath(w: number, h: number): string {
  let d = '';
  // Start a full box-height to the left so the first stripes still cross x=0.
  for (let x = -h; x < w; x += CONFLICT_STRIPE_STEP) {
    d += `M${x.toFixed(2)},${h} L${(x + h).toFixed(2)},0 `;
  }
  return d;
}

type Props = {
  item: ArtistBlockModel;
  /**
   * Takes the block's own event/artist rather than being pre-bound by the lane:
   * a per-block closure would be a fresh function on every lane render and defeat
   * the memoisation below, which is what keeps a day's progressive mount from
   * re-rendering everything already on screen at each step.
   */
  onPress: (event: DbEvent, artist: DbArtist) => void;
};

function LabelContent({ label }: { label: BlockLabelModel }) {
  return (
    <>
      <Text
        numberOfLines={label.lines}
        style={{ fontSize: label.fontSize, color: colors.textPrimary, fontFamily: 'Bold-Default' }}
      >
        {label.name}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textPrimary }}>
        {label.time}
      </Text>
    </>
  );
}

function ArtistBlockBase({ item, onPress }: Props) {
  const { label } = item;
  const handlePress = (): void => { onPress(item.event, item.artist); };
  return (
    <View
      style={{
        position: 'absolute',
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{
          flex: 1,
          backgroundColor: item.bg,
          borderColor: item.border,
          borderLeftWidth: BLOCK_LAYOUT.borderLeft,
          overflow: 'hidden',
          justifyContent: 'flex-start',
          padding: BLOCK_LAYOUT.padding,
        }}
      >
        {label !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
            {/* Label area. Repeats are positioned against this box, so their
                offsets are measured from the first label rather than from the
                block's border — no padding arithmetic. The block already clips,
                and the offsets stay clear of the star. */}
            <View style={{ flex: 1 }}>
              {label.segmentWidth !== null ? (
                <View style={{ maxWidth: label.segmentWidth }}><LabelContent label={label} /></View>
              ) : (
                <LabelContent label={label} />
              )}
              {label.repeats.map((repeat) => (
                <View
                  key={repeat.left}
                  style={{ position: 'absolute', left: repeat.left, top: 0, width: repeat.width }}
                >
                  <LabelContent label={label} />
                </View>
              ))}
            </View>
            {/* Rendered bare rather than in a row wrapper: StarIndicator is a
                single glyph, so the wrapper only ever added one more native view
                per block — and there are ~75 blocks in a day. */}
            <StarIndicator status={item.status} size={BLOCK_LAYOUT.starSize} />
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Conflict markers — 45° red / dark-red striped bars laid OVER the block,
          one per overlap interval */}
      {item.bars.map((bar) => {
        const clipId = `conflictClip-${bar.key}`;
        return (
          <Svg
            key={bar.key}
            pointerEvents="none"
            width={bar.width}
            height={BLOCK_LAYOUT.barHeight}
            style={{ position: 'absolute', bottom: -BLOCK_LAYOUT.barRaise, left: bar.left }}
          >
            {/* The stripes start off-box on both sides so they reach the corners;
                clip them back to the bar. */}
            <Defs>
              <ClipPath id={clipId}>
                <Rect width={bar.width} height={BLOCK_LAYOUT.barHeight} />
              </ClipPath>
            </Defs>
            <Rect width={bar.width} height={BLOCK_LAYOUT.barHeight} fill={colors.danger} />
            <Path
              d={stripePath(bar.width, BLOCK_LAYOUT.barHeight)}
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

/**
 * Renders again only when what it shows changes (sameProps). The lane rebuilds
 * its blocks' models on every render — a mount step, a pick — so each block
 * skips exactly the renders that would repaint the same thing.
 */
export const ArtistBlock = React.memo(ArtistBlockBase, sameProps);
