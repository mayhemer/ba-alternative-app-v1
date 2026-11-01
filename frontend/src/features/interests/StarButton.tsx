import React, { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { MeasurableStar } from './StarSelectorContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from './InterestContext';
import { isInterested } from '../../lib/interestUtils';
import { STAR_CONFIG, STAR_HIT_SLOP, STAR_ICON_SIZE, starGlyphModel } from './StarButton.model';

export { getFeedbackLabel, STAR_COLUMN_RESERVE } from './StarButton.model';
export type { StarIconName } from './StarButton.model';

// ── StarGlyph ─────────────────────────────────────────────────────────────────
// The star for a status, as the star button shows it. Ionicons has no struck-out
// star, so 'dont_go' lays a bar over the outline instead of pulling in a second
// icon font (which would have to be preloaded behind the splash, see fonts.ts).
//
// The glyph is the same view for every status, never wrapped: a press re-renders
// the star while a quick second tap may already be down on it, and a glyph
// remounted under that finger would lose the tap on native (its release goes to
// a view that no longer exists). So the bar is a sibling laid over the glyph,
// which never takes a touch itself.
//
// The bar is positioned in the glyph's parent, which must be the glyph's own
// size (the star button's Pressable, the selector's slot wrapper). The glyph is
// text, and its line box is taller than `size`; the bar sits on the size × size
// square the glyph is drawn in (its model), at the top of that box, not on the
// box's centre, which sits below the star's.

type GlyphProps = {
  status: InterestStatus;
  size: number;
  color?: string; // overrides the status colour, shape only
};

export function StarGlyph({ status, size, color }: GlyphProps) {
  const model = starGlyphModel(status, size, color);
  const { strike } = model;
  return (
    <>
      <Ionicons name={model.icon} size={model.size} color={model.color} />
      {strike !== null && (
        <View
          testID="star-strike"
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: strike.left,
            top: strike.top,
            width: strike.length,
            height: strike.thickness,
            borderRadius: strike.thickness / 2,
            backgroundColor: model.color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      )}
    </>
  );
}

// ── StarIndicator ─────────────────────────────────────────────────────────────
// Small non-interactive indicator shown next to artist names in lists/sheets.
// Renders nothing unless the artist is a pick ('none' and 'dont_go').

type IndicatorProps = {
  status: InterestStatus;
  size?: number;
};

export function StarIndicator({ status, size = 14 }: IndicatorProps) {
  if (!isInterested(status)) { return null; }
  const config = STAR_CONFIG[status];
  return <Ionicons name={config.icon} size={size} color={config.color} />;
}

// ── StarButton ────────────────────────────────────────────────────────────────

type Props = {
  status: InterestStatus;
  /** Gets the pressed star, which the star selector measures and opens beside. */
  onPress: (star: MeasurableStar | null) => void;
  label: string;
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, label, size = 'small' }: Props) {
  const iconSize = STAR_ICON_SIZE[size];
  const slop = STAR_HIT_SLOP[size];
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const handlePress = useCallback(() => { onPress(ref.current); }, [onPress]);

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      hitSlop={slop}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <StarGlyph status={status} size={iconSize} />
    </Pressable>
  );
}
