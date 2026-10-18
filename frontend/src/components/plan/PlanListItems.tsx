import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import { formatDayTitle, formatDuration, formatRemaining, planStrings } from './planStrings';
import { BOLD, LIST_GUTTER, PROGRESS_BAR_WIDTH, TABULAR } from './planStyles';
import type { PlanCapItem, PlanGapItem } from '../../utils/planUtils';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── The non-set items of My plan's list ───────────────────────────────────────
//
// All are drawn across the full list width, side gutters included, so the now
// arrow (which sits in the left gutter) and the conflict title stay inside their
// own cell: on Android a touch outside a cell's bounds never reaches it.

const strings = planStrings();

// ── Now arrow ─────────────────────────────────────────────────────────────────

const ARROW_WIDTH = 20;
const ARROW_HEIGHT = 30;
const ARROW_PATH = 'M2 3L18 15L2 27z';

/**
 * The white "you are here" triangle, its centre at `y` within the item. Drawn
 * from the gutter's edge, its tip reaching about 4 pt into the row; outlined in
 * the surface colour so it stays distinct over a progress bar.
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
      <Path d={ARROW_PATH} fill="none" stroke={colors.surface} strokeWidth={4} strokeLinejoin="round" />
      <Path d={ARROW_PATH} fill={colors.white} />
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
export function ConflictGroupTitle({ event, overlappingEvents, onPress }: {
  event: DbEvent;
  overlappingEvents: DbEvent[];
  onPress: (event: DbEvent, overlappingEvents: DbEvent[]) => void;
}) {
  return (
    <Pressable
      onPress={() => { onPress(event, overlappingEvents); }}
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

// ── Day title ─────────────────────────────────────────────────────────────────

export type DayTone = 'today' | 'past' | 'future' | 'outside';

function toneColor(tone: DayTone): string {
  switch (tone) {
    case 'today': return colors.accent;
    case 'future': return colors.breakBlue;
    case 'past': return colors.pastDay;
    default: return colors.textPrimary;
  }
}

/** One line, centred: the weekday in capitals, then the date. Never sticky. */
export function PlanDayTitle({ dayStart, tone, height }: { dayStart: number; tone: DayTone; height: number }) {
  const { weekday, date } = formatDayTitle(dayStart);
  const color = toneColor(tone);
  return (
    <View accessibilityRole="header" style={{ height, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
      <Text style={[BOLD, { fontSize: 18, letterSpacing: 0.7, textTransform: 'uppercase', color }]}>{weekday}</Text>
      <Text style={{ fontSize: 15, color }}>{date}</Text>
    </View>
  );
}

// ── Gap ───────────────────────────────────────────────────────────────────────

const RAIL_WIDTH = 2;
const RAIL_X = LIST_GUTTER + PROGRESS_BAR_WIDTH;
const CAP_GLYPH = 10;

/** The day's start (a ring) or end (a filled square), centred on the rail at the cell's top or bottom. */
function RailEnd({ edge, height }: { edge: 'start' | 'end'; height: number }) {
  const c = CAP_GLYPH / 2;
  return (
    <Svg
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

/** Time between sets: a dotted rail and its length; the current one shows progress and a countdown. */
export function PlanGap({ item, children }: { item: PlanGapItem; children?: React.ReactNode }) {
  return (
    <View testID="plan-gap" style={{ height: item.height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg pointerEvents="none" width={RAIL_WIDTH} height={item.height} style={{ position: 'absolute', left: RAIL_X, top: 0 }}>
        <Line x1={RAIL_WIDTH / 2} y1={0} x2={RAIL_WIDTH / 2} y2={item.height} stroke={colors.borderMid} strokeWidth={RAIL_WIDTH} strokeDasharray="2,2" />
      </Svg>
      {item.current && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: LIST_GUTTER, top: 0, bottom: 0, width: PROGRESS_BAR_WIDTH, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.breakTrack }}
        >
          <View style={{ width: PROGRESS_BAR_WIDTH, height: `${item.progress * 100}%`, backgroundColor: colors.breakBlue }} />
        </View>
      )}
      {item.current ? (
        <Text style={[BOLD, TABULAR, { fontSize: 15, color: colors.breakBlue }]}>{formatRemaining(item.remainingMs)}</Text>
      ) : (
        <Text style={[TABULAR, { fontSize: 12, color: colors.muted }]}>{formatDuration(item.minutes * 60 * 1000)}</Text>
      )}
      {item.opening && <RailEnd edge="start" height={item.height} />}
      {item.current && <NowArrow y={item.progress * item.height} />}
      {children}
    </View>
  );
}

/** A day cap: a bare rail of fixed length, ring on top or square at the bottom. */
export function PlanCap({ item, children }: { item: PlanCapItem; children?: React.ReactNode }) {
  const from = item.edge === 'start' ? CAP_GLYPH / 2 : 0;
  const to = item.edge === 'start' ? item.height : item.height - CAP_GLYPH / 2;
  return (
    <View testID="plan-cap" style={{ height: item.height }}>
      <Svg pointerEvents="none" width={RAIL_WIDTH} height={item.height} style={{ position: 'absolute', left: RAIL_X, top: 0 }}>
        <Line x1={RAIL_WIDTH / 2} y1={from} x2={RAIL_WIDTH / 2} y2={to} stroke={colors.borderMid} strokeWidth={RAIL_WIDTH} strokeDasharray="2,2" />
      </Svg>
      <RailEnd edge={item.edge} height={item.height} />
      {children}
    </View>
  );
}

// ── Empty day ─────────────────────────────────────────────────────────────────

export function PlanEmpty({ conflictsOnly, height }: { conflictsOnly: boolean; height: number }) {
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: LIST_GUTTER }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>
        {conflictsOnly ? strings.emptyConflicts : strings.empty}
      </Text>
    </View>
  );
}
