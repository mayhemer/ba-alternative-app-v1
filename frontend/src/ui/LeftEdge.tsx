import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LEFT_EDGE_WIDTH, leftEdgeDotsPath, type LeftEdgeKind } from './LeftEdge.model';

// ── A box's left edge ─────────────────────────────────────────────────────────
//
// Along the box's whole left side, LEFT_EDGE_WIDTH wide, over its background: a
// solid bar or square dots (placed by leftEdgeDots), in the colour given;
// nothing for no edge. The box clips it (a set row's rounded corners). My plan's
// set rows and the timeline's blocks draw their pick's edge with it.

/** One path per box height: there are only a few (My plan's two rows, a timeline block). */
const dotPaths = new Map<number, string>();

function dotsPath(height: number): string {
  let d = dotPaths.get(height);
  if (d === undefined) {
    d = leftEdgeDotsPath(height);
    dotPaths.set(height, d);
  }
  return d;
}

type Props = { edge: LeftEdgeKind; height: number; color: string };

export function LeftEdge({ edge, height, color }: Props) {
  switch (edge) {
    case 'solid':
      return (
        <View
          testID="left-edge-solid"
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: LEFT_EDGE_WIDTH, backgroundColor: color }}
        />
      );
    case 'dotted':
      return (
        <Svg
          testID="left-edge-dotted"
          pointerEvents="none"
          width={LEFT_EDGE_WIDTH}
          height={height}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Path testID="left-edge-dots" d={dotsPath(height)} fill={color} />
        </Svg>
      );
    case null:
      return null;
  }
}
