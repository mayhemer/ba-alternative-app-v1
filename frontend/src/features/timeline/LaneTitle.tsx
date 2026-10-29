import React from 'react';
import { View } from 'react-native';
import { Text } from '../../ui/Text';
import { sameProps } from '../../ui/sameProps';
import type { LaneTitleModel } from './CategoryLane.model';
import { colors } from '../../styling/tokens';

// ── A lane's title ────────────────────────────────────────────────────────────
//
// Draws its model (laneTitleModel, from the same lane model as the lane it
// names): in its strip, or over the lane on a short viewport.

// Distance from the viewport's left edge.
const TITLE_INSET = 8;

function LaneTitleBase({ item }: { item: LaneTitleModel }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: item.top,
        left: 0,
        right: 0,
        height: item.height,
        justifyContent: item.overLane ? 'flex-start' : 'center',
        paddingTop: item.paddingTop,
        paddingHorizontal: TITLE_INSET,
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: item.fontSize, color: colors.textSecondary }}>
        {item.text}
      </Text>
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps): a lane hidden above it moves it. */
export const LaneTitle = React.memo(LaneTitleBase, sameProps);
