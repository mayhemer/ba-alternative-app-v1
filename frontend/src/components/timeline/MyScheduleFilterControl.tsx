import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTimelineFilter } from '../../context/TimelineFilterContext';

// Module-level component — registered as TopBar RightComponent for TimelineScreen.
// Reads its own context directly; no props needed.

export function MyScheduleFilterControl() {
  const { myScheduleOnly, setMyScheduleOnly } = useTimelineFilter();

  return (
    <TouchableOpacity
      onPress={() => setMyScheduleOnly(!myScheduleOnly)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={myScheduleOnly ? 'Show all artists' : 'Show my schedule only'}
      accessibilityRole="button"
    >
      <Text style={{ fontSize: 16, color: myScheduleOnly ? '#e8c84a' : '#555555' }}>
        ★
      </Text>
    </TouchableOpacity>
  );
}
