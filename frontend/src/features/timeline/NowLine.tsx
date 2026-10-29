import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { NOW_LINE_ARROW_SIZE } from './timelineLayout';
import { nowLineStyle } from './NowLine.model';
import { colors } from '../../styling/tokens';

type Props = {
  nowX: SharedValue<number>;
  canvasHeight: number;
  top?: number;
  showArrow?: boolean;
  testID?: string;
};

function NowLineBase({ nowX, canvasHeight, top = 0, showArrow = false, testID }: Props) {
  // Position and visibility are driven on the UI thread — no JS re-renders.
  const lineStyle = useAnimatedStyle(() => nowLineStyle(nowX.value));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top,
          height: canvasHeight,
          backgroundColor: colors.danger,
        },
        lineStyle,
      ]}
    >
      {showArrow && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -NOW_LINE_ARROW_SIZE,
            width: 0,
            height: 0,
            borderLeftWidth: NOW_LINE_ARROW_SIZE,
            borderRightWidth: NOW_LINE_ARROW_SIZE,
            borderTopWidth: NOW_LINE_ARROW_SIZE,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: colors.danger,
          }}
        />
      )}
    </Animated.View>
  );
}

// One per lane, and all its props are stable — memoising keeps the whole set out
// of every progressive-mount step.
export const NowLine = React.memo(NowLineBase);
