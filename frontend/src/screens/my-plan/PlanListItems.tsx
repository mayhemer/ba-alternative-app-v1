import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '../../ui/Text';
import { conflictStrings } from '../../features/conflicts/conflictStrings';
import { CAP_GLYPH, LIST_GUTTER, PROGRESS_BAR_WIDTH } from './planStyles';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── Pieces shared by My plan's list cells ─────────────────────────────────────
//
// The cells are drawn across the full list width, side gutters included, so the now
// arrow (which sits in the left gutter) and the conflict title stay inside their
// own cell: on Android a touch outside a cell's bounds never reaches it.

const strings = conflictStrings();

// ── Now arrow ─────────────────────────────────────────────────────────────────

const ARROW_WIDTH = 20;
const ARROW_HEIGHT = 30;
const ARROW_PATH = 'M2 3L18 15L2 27z';

/**
 * The red "you are here" triangle, its centre at `y` within the item. Drawn
 * from the gutter's edge, its tip reaching about 4 pt into the row, halfway
 * across the progress bar; a 1 pt white outline keeps it distinct over the bar.
 */
export function NowArrow({ y }: { y: number }) {
  return (
    <Svg
      testID="plan-now-arrow"
      pointerEvents="none"
      width={ARROW_WIDTH}
      height={ARROW_HEIGHT}
      style={{ position: 'absolute', left: -2, top: y - ARROW_HEIGHT / 2, zIndex: 2 }}
    >
      <Path d={ARROW_PATH} fill={colors.danger} stroke={colors.white} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}

// ── Conflict group title ──────────────────────────────────────────────────────

const CONFLICT_TITLE_HIT_SLOP = { top: 14, bottom: 14, left: 12, right: 12 };

/**
 * "⚠ Conflict" over the first set of a clash group, right-aligned. Drawn by the
 * gap or spacer cell just above that set, at its bottom edge; opens the
 * conflict detail sheet.
 */
export function ConflictGroupTitle({ event, onPress }: {
  event: DbEvent;
  onPress: (event: DbEvent) => void;
}) {
  return (
    <Pressable
      onPress={() => { onPress(event); }}
      hitSlop={CONFLICT_TITLE_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={strings.conflict}
      style={{ position: 'absolute', right: LIST_GUTTER + 2, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Ionicons name="warning-outline" size={14} color={colors.danger} />
      <Text style={{ fontSize: 13, lineHeight: 16, color: colors.danger }}>{strings.conflict}</Text>
    </Pressable>
  );
}

// ── The rail ──────────────────────────────────────────────────────────────────
//
// The dotted line down the left of gaps and caps, and its two ends.

export const RAIL_WIDTH = 2;
export const RAIL_X = LIST_GUTTER + PROGRESS_BAR_WIDTH;

/** The day's start (a ring) or end (a filled square), centred on the rail at the cell's top or bottom. */
export function RailEnd({ edge, height }: { edge: 'start' | 'end'; height: number }) {
  const c = CAP_GLYPH / 2;
  return (
    <Svg
      testID={`plan-rail-${edge}`}
      pointerEvents="none"
      width={CAP_GLYPH}
      height={CAP_GLYPH}
      style={{ position: 'absolute', left: RAIL_X + RAIL_WIDTH / 2 - c, top: edge === 'start' ? 0 : height - CAP_GLYPH, zIndex: 1 }}
    >
      {edge === 'start'
        ? <Circle cx={c} cy={c} r={c - 1} fill={colors.background} stroke={colors.borderMid} strokeWidth={RAIL_WIDTH} />
        : <Rect x={1} y={1} width={CAP_GLYPH - 2} height={CAP_GLYPH - 2} fill={colors.borderMid} />}
    </Svg>
  );
}
