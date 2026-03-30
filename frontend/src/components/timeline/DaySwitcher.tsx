import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { formatDayLabel } from './timelineLayout';
import { colors } from '../../styling/tokens';

// Module-level component — registered as BottomBar ContentComponent for TimelineScreen.
// Reads its own context directly; no props needed.

export function DaySwitcher() {
  const { festivalDays, selectedDayStart, setSelectedDayStart } = useTimelineFilter();

  if (festivalDays.length === 0) { return null; }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, flexGrow: 1, justifyContent: 'center' }}
    >
      {festivalDays.map((dayStart) => {
        const isActive = dayStart === selectedDayStart;
        return (
          <TouchableOpacity
            key={dayStart}
            onPress={() => setSelectedDayStart(dayStart)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              backgroundColor: isActive ? colors.accent : colors.surfaceRaised,
              borderWidth: 1,
              borderColor: isActive ? colors.accent : colors.borderMid,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isActive ? colors.black : colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {formatDayLabel(dayStart)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
