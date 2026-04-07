import React from 'react';
import { TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { colors } from '../../styling/tokens';

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
      <FontAwesome name="star" size={16} color={myScheduleOnly ? colors.accent : colors.muted} />
    </TouchableOpacity>
  );
}
