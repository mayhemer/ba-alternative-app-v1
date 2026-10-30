import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../../ui/Text';
import type { DbArtist, DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';
import { StarIndicator } from '../interests/StarButton';
import { sameProps } from '../../ui/sameProps';
import { BLOCK_LAYOUT, type ArtistBlockModel, type BlockLabelModel } from './ArtistBlock.model';
import { CONFLICT_STRIPE, stripePath } from '../../ui/stripes';

// ── A set's block on the timeline ─────────────────────────────────────────────
//
// Draws its model (ArtistBlock.model.ts): the box at its time and row, the
// label (repeated along a long block), the star, and the conflict bars.

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
        testID="block-box"
        onPress={handlePress}
        style={{
          flex: 1,
          backgroundColor: item.bg,
          borderLeftColor: item.border,
          borderLeftWidth: BLOCK_LAYOUT.borderLeft,
          // A muted block is only outlined: a dotted grey frame, the same width
          // on every side (Android draws a dotted border only then), so its left
          // edge loses the stage colour too.
          ...(item.edge !== null && {
            borderWidth: BLOCK_LAYOUT.mutedEdgeWidth,
            borderLeftWidth: BLOCK_LAYOUT.mutedEdgeWidth,
            borderStyle: BLOCK_LAYOUT.mutedEdgeStyle,
            borderColor: item.edge,
            borderLeftColor: item.edge,
          }),
          overflow: 'hidden',
          justifyContent: 'flex-start',
          padding: BLOCK_LAYOUT.padding,
        }}
      >
        {label !== null ? (
          <View testID="block-label" style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, opacity: item.textOpacity }}>
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
