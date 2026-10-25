import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from '../context/InterestContext';
import { isInterested } from '../utils/interestUtils';
import { STAR_CONFIG, STAR_HIT_SLOP, STAR_ICON_SIZE, starGlyphModel } from './StarButton.model';

export { getFeedbackLabel, STAR_COLUMN_RESERVE } from './StarButton.model';
export type { StarIconName } from './StarButton.model';

// ── StarGlyph ─────────────────────────────────────────────────────────────────
// The star for a status, as the star button shows it. Ionicons has no struck-out
// star, so 'dont_go' lays a bar over the outline instead of pulling in a second
// icon font (which would have to be preloaded behind the splash, see fonts.ts).
// Every other status stays a bare glyph — the shape every artist row renders.

type GlyphProps = {
  status: InterestStatus;
  size: number;
  color?: string; // overrides the status colour, shape only
};

export function StarGlyph({ status, size, color }: GlyphProps) {
  const model = starGlyphModel(status, size, color);
  const glyph = <Ionicons name={model.icon} size={model.size} color={model.color} />;
  if (model.strike === null) { return glyph; }

  // The wrapper takes the glyph's own size: the glyph is text, and its line box
  // is taller than `size`, so a fixed size would make this star shorter than the
  // bare ones and shift whatever is laid out around the button. The bar sits on
  // the size × size square the glyph is drawn in (its model), at the top of that
  // box — not on the box's centre, which sits below the star's.
  const { strike } = model;
  return (
    <View>
      {glyph}
      <View
        testID="star-strike"
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
    </View>
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
  onPress: () => void;
  label: string;
  size?: 'small' | 'large';
};

export function StarButton({ status, onPress, label, size = 'small' }: Props) {
  const iconSize = STAR_ICON_SIZE[size];
  const slop = STAR_HIT_SLOP[size];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={slop}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <StarGlyph status={status} size={iconSize} />
    </Pressable>
  );
}
