import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { ConflictGroupTitle, RAIL_WIDTH, RAIL_X, RailEnd } from './PlanListItems';
import { CAP_GLYPH } from './planStyles';
import { sameProps } from '../sameProps';
import type { PlanCapModel } from './PlanCap.model';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── A day cap ─────────────────────────────────────────────────────────────────
//
// A bare rail of fixed length, ring on top or square at the bottom. The start
// cap right above a clash group carries its "Conflict" title.

type Props = { item: PlanCapModel; onPressConflict?: (event: DbEvent) => void };

const NO_OP = (): void => undefined;

function PlanCapBase({ item, onPressConflict = NO_OP }: Props) {
  const from = item.edge === 'start' ? CAP_GLYPH / 2 : 0;
  const to = item.edge === 'start' ? item.height : item.height - CAP_GLYPH / 2;
  return (
    <View testID="plan-cap" style={{ height: item.height }}>
      <Svg pointerEvents="none" width={RAIL_WIDTH} height={item.height} style={{ position: 'absolute', left: RAIL_X, top: 0 }}>
        <Line x1={RAIL_WIDTH / 2} y1={from} x2={RAIL_WIDTH / 2} y2={to} stroke={colors.borderMid} strokeWidth={RAIL_WIDTH} strokeDasharray="2,2" />
      </Svg>
      <RailEnd edge={item.edge} height={item.height} />
      {item.conflictTitle !== null && <ConflictGroupTitle event={item.conflictTitle} onPress={onPressConflict} />}
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanCap = memo(PlanCapBase, sameProps);
