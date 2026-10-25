import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { CANVAS_WIDTH, RULER_HEIGHT, VIEW_OFFSET_X, VIEW_WIDTH } from './timelineLayout';
import { hourTickModels } from './TimeRuler.model';
import { NowLine } from './NowLine';
import { colors } from '../../styling/tokens';

type Props = {
  dayStart: number;
  scrollX: SharedValue<number>;
  nowX: SharedValue<number>;
};

// The same 25 ticks for every day.
const HOUR_TICKS = hourTickModels();

/** The hour labels and ticks across the whole day canvas, 06:00 to 06:00 (TimeRuler.model.ts). */
export function HourTicks() {
  return (
    <>
      {HOUR_TICKS.map((tick) => (
        <View
          key={tick.key}
          style={{ position: 'absolute', left: tick.x, top: 0, bottom: 0, alignItems: 'flex-start' }}
        >
          <View style={{ width: 1, height: 10, backgroundColor: colors.muted, marginTop: 0  }} />
          <Text style={{ fontSize: 12, color: colors.timeline.rulerText, marginTop: 2, marginLeft: 2 }}>
            {tick.label}
          </Text>
        </View>
      ))}
    </>
  );
}

function TimeRulerBase(_props: Props) {
  const { scrollX, nowX } = _props;

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
        <NowLine testID="now-line" nowX={nowX} canvasHeight={RULER_HEIGHT} showArrow />
        <HourTicks />
      </Animated.View>
    </View>
  );
}

// 25 hour ticks, each a view plus a text. Nothing here depends on anything that
// changes while a day is mounting progressively, so memoising keeps the ruler
// out of every expansion step.
export const TimeRuler = React.memo(TimeRulerBase);
