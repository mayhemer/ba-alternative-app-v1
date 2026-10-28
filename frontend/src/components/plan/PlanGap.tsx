import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Text } from '../ui/Text';
import { ConflictGroupTitle, NowArrow, RAIL_WIDTH, RAIL_X, RailEnd } from './PlanListItems';
import { sameProps } from '../sameProps';
import { BOLD, LIST_GUTTER, PROGRESS_BAR_WIDTH, PROGRESS_COLORS, TABULAR } from './planStyles';
import type { PlanGapModel } from './PlanGap.model';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── A gap between sets ────────────────────────────────────────────────────────
//
// A dotted rail and its label; the current one adds the blue fill and the now
// arrow, and counts down in bold, or, to a Maybe, smaller in a dashed box (the
// Maybe's own outline), so it reads apart from the pill's countdown to the next
// Must-see. The one above a clash group carries its "Conflict" title. Draws its
// model (PlanGap.model.ts) and computes nothing itself.

type Props = { item: PlanGapModel; onPressConflict?: (event: DbEvent) => void };

const MAYBE_COUNTDOWN_BOX = {
  borderWidth: 1,
  borderStyle: 'dashed' as const,
  borderColor: colors.breakBlue,
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 1,
};

function GapLabel({ item }: { item: PlanGapModel }) {
  if (!item.current) {
    return <Text style={[TABULAR, { fontSize: 12, color: colors.muted }]}>{item.label}</Text>;
  }
  if (item.countdownToMaybe) {
    return (
      <View testID="plan-gap-maybe-box" style={MAYBE_COUNTDOWN_BOX}>
        <Text style={[TABULAR, { fontSize: 13, lineHeight: 18, color: colors.breakBlue }]}>{item.label}</Text>
      </View>
    );
  }
  return <Text style={[BOLD, TABULAR, { fontSize: 15, color: colors.breakBlue }]}>{item.label}</Text>;
}

const NO_OP = (): void => undefined;

function PlanGapBase({ item, onPressConflict = NO_OP }: Props) {
  return (
    <View testID="plan-gap" style={{ height: item.height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg pointerEvents="none" width={RAIL_WIDTH} height={item.height} style={{ position: 'absolute', left: RAIL_X, top: 0 }}>
        <Line x1={RAIL_WIDTH / 2} y1={0} x2={RAIL_WIDTH / 2} y2={item.height} stroke={colors.borderMid} strokeWidth={RAIL_WIDTH} strokeDasharray="2,2" />
      </Svg>
      {item.current && (
        <View
          testID="plan-gap-progress"
          pointerEvents="none"
          style={{ position: 'absolute', left: LIST_GUTTER, top: item.barTop, bottom: 0, width: PROGRESS_BAR_WIDTH, borderRadius: 3, overflow: 'hidden', backgroundColor: PROGRESS_COLORS.break.remaining }}
        >
          <View testID="plan-gap-fill" style={{ width: PROGRESS_BAR_WIDTH, height: `${item.progress * 100}%`, backgroundColor: PROGRESS_COLORS.break.passed }} />
        </View>
      )}
      <GapLabel item={item} />
      {item.opening && <RailEnd edge="start" height={item.height} />}
      {item.nowY !== null && <NowArrow y={item.nowY} />}
      {item.conflictTitle !== null && <ConflictGroupTitle event={item.conflictTitle} onPress={onPressConflict} />}
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanGap = memo(PlanGapBase, sameProps);
