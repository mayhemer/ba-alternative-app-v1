import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { formatDayLabel } from './timelineLayout';

// Module-level component — registered as BottomBar ContentComponent for TimelineScreen.
// Reads its own context directly; no props needed.

export function DaySwitcher() {
  const { festivalDays, selectedDayStart, setSelectedDayStart } = useTimelineFilter();

  if (festivalDays.length === 0) { return null; }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
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
              backgroundColor: isActive ? '#e8c84a' : '#1a1a1a',
              borderWidth: 1,
              borderColor: isActive ? '#e8c84a' : '#333333',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isActive ? '#000000' : '#888888',
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
