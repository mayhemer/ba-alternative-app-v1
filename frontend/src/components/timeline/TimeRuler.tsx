import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { CANVAS_WIDTH, DAY_BOUNDARY_HOUR, PIXELS_PER_HOUR, RULER_HEIGHT, VIEW_OFFSET_X, VIEW_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';

type Props = {
  dayStart: number;
  scrollX: SharedValue<number>;
};

export function TimeRuler(_props: Props) {
  const { scrollX } = _props;
  const ticks = Array.from({ length: 25 }, (_, i) => i);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(scrollX.value + VIEW_OFFSET_X) }],
  }));

  return (
    <View
      style={{
        width: VIEW_WIDTH,
        height: RULER_HEIGHT,
        overflow: 'hidden',
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.timeline.rulerBorder,
      }}
    >
      <Animated.View style={[{ width: CANVAS_WIDTH, height: RULER_HEIGHT, position: 'relative' }, animatedStyle]}>
        {ticks.map((h) => {
          const hour = (DAY_BOUNDARY_HOUR + h) % 24;
          const x    = h * PIXELS_PER_HOUR;
          return (
            <View
              key={h}
              style={{ position: 'absolute', left: x, top: 0, bottom: 0, alignItems: 'flex-start' }}
            >
              <View style={{ width: 1, height: 6, backgroundColor: colors.muted, marginTop: 4 }} />
              <Text style={{ fontSize: 10, color: colors.timeline.rulerText, marginTop: 2, marginLeft: 2 }}>
                {String(hour).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
