import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { CANVAS_WIDTH, NOW_LINE_ARROW_SIZE } from './timelineLayout';
import { colors } from '../../styling/tokens';

type Props = {
  nowX: SharedValue<number>;
  canvasHeight: number;
  top?: number;
  showArrow?: boolean;
};

export function NowLine({ nowX, canvasHeight, top = 0, showArrow = false }: Props) {
  // Position and visibility are driven on the UI thread — no JS re-renders.
  const lineStyle = useAnimatedStyle(() => {
    const x = nowX.value;
    const visible = x > 0 && x < CANVAS_WIDTH;
    return {
      left: x,
      // Collapse to zero width when outside the day window so nothing shows.
      width: visible ? 1 : 0,
      opacity: visible ? 1 : 0,
    };
  });

  return (
    <Animated.View
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
