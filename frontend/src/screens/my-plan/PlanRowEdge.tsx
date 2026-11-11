import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ROW_EDGE_WIDTH } from './planStyles';
import { rowEdgeDotsPath } from './PlanRowEdge.model';
import type { PlanSetModel } from './PlanSetRow.model';

// ── A set row's left edge ─────────────────────────────────────────────────────
//
// Along the row's whole left side, ROW_EDGE_WIDTH wide, over its background: a
// solid bar (a Must-see) or square dots (a Maybe, placed by rowEdgeDots), in the
// colour given; nothing for any other row. The row's rounded corners clip it.

/** One path per row height: there are only two. */
const dotPaths = new Map<number, string>();

function dotsPath(height: number): string {
  let d = dotPaths.get(height);
  if (d === undefined) {
    d = rowEdgeDotsPath(height);
    dotPaths.set(height, d);
  }
  return d;
}

type Props = { edge: PlanSetModel['edge']; height: number; color: string };

export function PlanRowEdge({ edge, height, color }: Props) {
  switch (edge) {
    case 'solid':
      return (
        <View
          testID="plan-row-edge-solid"
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: ROW_EDGE_WIDTH, backgroundColor: color }}
        />
      );
    case 'dotted':
      return (
        <Svg
          testID="plan-row-edge-dotted"
          pointerEvents="none"
          width={ROW_EDGE_WIDTH}
          height={height}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Path testID="plan-row-edge-dots" d={dotsPath(height)} fill={color} />
        </Svg>
      );
    case null:
      return null;
  }
}
