import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CANVAS_WIDTH, NOW_ARROW_SIZE, timeToX } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { currentTimeMs } from '../../utils/clock';

type Props = {
  dayStart: number;
  canvasHeight: number;
  top?: number;
  showArrow?: boolean;
};

export function NowLine({ dayStart, canvasHeight, top = 0, showArrow = false }: Props) {
  const [nowX, setNowX] = useState(() => timeToX(currentTimeMs(), dayStart));

  // Recompute position every minute and whenever dayStart changes.
  useEffect(() => {
    setNowX(timeToX(currentTimeMs(), dayStart));
    const interval = setInterval(() => {
      setNowX(timeToX(currentTimeMs(), dayStart));
    }, 60_000);
    return () => clearInterval(interval);
  }, [dayStart]);

  // Outside the day window — nothing to show.
  if (nowX <= 0 || nowX >= CANVAS_WIDTH) { return null; }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: nowX,
        top,
        height: canvasHeight,
        width: 1,
        backgroundColor: colors.danger,
      }}
    >
      {showArrow && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -NOW_ARROW_SIZE,
            width: 0,
            height: 0,
            borderLeftWidth: NOW_ARROW_SIZE,
            borderRightWidth: NOW_ARROW_SIZE,
            borderTopWidth: NOW_ARROW_SIZE,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: colors.danger,
          }}
        />
      )}
    </View>
  );
}
