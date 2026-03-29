import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CANVAS_WIDTH, timeToX } from './timelineLayout';

type Props = {
  dayStart: number;
  canvasHeight: number;
};

export function NowLine({ dayStart, canvasHeight }: Props) {
  const [nowX, setNowX] = useState(() => timeToX(Date.now(), dayStart));

  // Recompute position every minute and whenever dayStart changes.
  useEffect(() => {
    setNowX(timeToX(Date.now(), dayStart));
    const interval = setInterval(() => {
      setNowX(timeToX(Date.now(), dayStart));
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
        top: 0,
        height: canvasHeight,
        width: 1,
        backgroundColor: '#ff4444',
      }}
    >
      <Text
        style={{
          position: 'absolute',
          top: 2,
          left: 3,
          fontSize: 8,
          fontWeight: '700',
          color: '#ff4444',
          letterSpacing: 0.5,
        }}
      >
        NOW
      </Text>
    </View>
  );
}
