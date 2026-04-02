import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { CONTENT_MAX_WIDTH } from './timelineLayout';
import { colors } from '../../styling/tokens';

// Module-level component — registered as BottomBar ContentComponent for TimelineScreen.
// Reads its own context directly; no props needed.

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWeekday(dayStartMs: number): string {
  return WEEKDAY_NAMES[new Date(dayStartMs).getDay()];
}

function formatDate(dayStartMs: number): string {
  const date = new Date(dayStartMs);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function DaySwitcher() {
  const { festivalDays, selectedDayStart, setSelectedDayStart } = useTimelineFilter();

  if (festivalDays.length === 0) { return null; }

  return (
    <View style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 8 }}>
      {festivalDays.map((dayStart) => {
        const isActive = dayStart === selectedDayStart;
        return (
          <TouchableOpacity
            key={dayStart}
            onPress={() => setSelectedDayStart(dayStart)}
            style={{
              flex: 1,
              paddingVertical: 6,
              alignItems: 'center',
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
              {formatWeekday(dayStart)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '400',
                color: isActive ? colors.black : colors.textMuted,
              }}
            >
              {formatDate(dayStart)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
