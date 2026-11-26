import React, { useCallback, useRef } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { MeasurableStar } from './StarSelectorContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from './InterestContext';
import { isInterested } from '../../lib/interestUtils';
import { STAR_CONFIG, STAR_HIT_SLOP, STAR_ICON_SIZE, starGlyphModel, type StarGlyphModel } from './StarButton.model';

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
  return (
    <>
      <Ionicons name={model.icon} size={model.size} color={model.color} />
      {strikeBar(model)}
    </>
  );
}

/** The bar over a struck star, positioned in the glyph's parent; nothing for an unstruck one. A plain function, not a component: no element of its own in every star. */
function strikeBar(model: StarGlyphModel): React.ReactElement | null {
  const { strike } = model;
  if (strike === null) {
    return null;
  }
  return (
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
  );
}

// ── StarMark ──────────────────────────────────────────────────────────────────
// The same star, not pressable, for lists that draw one on many rows at once
// (My plan). It is the icon font's glyph in React Native's own Text, with nothing
// round it: `<Ionicons>` adds two class components and the glyph's parent a View,
// and on mount those cost about as much again as the star itself (the perf gate's
// My plan scenarios, 2026-11-26). The font is loaded behind the splash (fonts.ts),
// so the glyph never waits for it as `<Ionicons>` would.
//
// A struck star still needs the parent its bar is laid out in, so 'dont_go' keeps
// a wrapper, which takes `testID` and `style`. That changes the view when the
// status crosses 'dont_go'; a mark takes no touch, so nothing is lost by it.

/** Ionicons' font, as `<Ionicons>` sets it on its Text; read on first use, not at import. */
let glyphFont: TextStyle | null = null;
function glyphFontStyle(): TextStyle {
  glyphFont ??= { fontFamily: Ionicons.getFontFamily(), fontWeight: 'normal', fontStyle: 'normal' };
  return glyphFont;
}

/** An icon's character, as `<Ionicons>` resolves it: the map holds code points, or the character itself. */
function glyphOf(icon: StarGlyphModel['icon']): string {
  const glyph = Ionicons.glyphMap[icon];
  return typeof glyph === 'number' ? String.fromCodePoint(glyph) : glyph;
}

type MarkProps = {
  status: InterestStatus;
  size: number;
  testID?: string;
  style?: StyleProp<ViewStyle & TextStyle>;
};

export function StarMark({ status, size, testID, style }: MarkProps) {
  const model = starGlyphModel(status, size);
  const glyph = (
    <Text
      testID={model.strike === null ? testID : undefined}
      selectable={false}
      allowFontScaling={false}
      style={[model.strike === null ? style : null, { fontSize: model.size, color: model.color }, glyphFontStyle()]}
    >
      {glyphOf(model.icon)}
    </Text>
  );
  if (model.strike === null) {
    return glyph;
  }
  return (
    <View testID={testID} style={style}>
      {glyph}
      {strikeBar(model)}
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
