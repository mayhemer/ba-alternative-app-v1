import React from 'react';
import { Text, View } from 'react-native';
import { CANVAS_WIDTH, DAY_BOUNDARY_HOUR, PIXELS_PER_HOUR, RULER_HEIGHT } from './timelineLayout';

type Props = {
  dayStart: number; // unused for rendering but kept for future tz-aware formatting
};

export function TimeRuler(_props: Props) {
  // Render one tick per hour for the full 24-hour day window.
  const ticks = Array.from({ length: 25 }, (_, i) => i);

  return (
    <View
      style={{
        width: CANVAS_WIDTH,
        height: RULER_HEIGHT,
        position: 'relative',
        backgroundColor: '#0a0a0a',
        borderBottomWidth: 1,
        borderBottomColor: '#222222',
      }}
    >
      {ticks.map((h) => {
        const hour = (DAY_BOUNDARY_HOUR + h) % 24;
        const x    = h * PIXELS_PER_HOUR;
        return (
          <View
            key={h}
            style={{ position: 'absolute', left: x, top: 0, bottom: 0, alignItems: 'flex-start' }}
          >
            <View style={{ width: 1, height: 6, backgroundColor: '#444444', marginTop: 4 }} />
            <Text style={{ fontSize: 9, color: '#666666', marginTop: 2, marginLeft: 2 }}>
              {String(hour).padStart(2, '0')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
