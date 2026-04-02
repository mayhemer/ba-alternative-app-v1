import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { useTimelineFilter } from '../../context/TimelineFilterContext';
import { CONTENT_MAX_WIDTH, NOW_BUTTON_ARROW_SIZE } from './timelineLayout';
import { colors } from '../../styling/tokens';
import { currentTimeMs } from '../../utils/clock';

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

const DAY_MS = 24 * 60 * 60 * 1000;

function getCurrentDayStart(festivalDays: number[]): number | null {
  const now = currentTimeMs();
  for (const dayStart of festivalDays) {
    if (now >= dayStart && now < dayStart + DAY_MS) {
      return dayStart;
    }
  }
  return null;
}

type Props = {
  screenKey: string;
};

export function DaySwitcher({ screenKey }: Props) {
  const { festivalDays, selectedDayStart, setSelectedDayStart, requestScrollToNow } = useTimelineFilter();

  if (festivalDays.length === 0) { return null; }

  const currentDayStart = getCurrentDayStart(festivalDays);

  return (
    <View style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 8 }}>
      {festivalDays.map((dayStart) => {
        const isActive = dayStart === selectedDayStart;
        const isToday = dayStart === currentDayStart;
        return (
          <TouchableOpacity
            key={dayStart}
            onPress={() => {
              if (dayStart === selectedDayStart && isToday) {
                requestScrollToNow(screenKey);
              } else {
                setSelectedDayStart(dayStart);
              }
            }}
            style={{
              flex: 1,
              paddingVertical: 6,
              alignItems: 'center',
              backgroundColor: isActive ? colors.accent : colors.surfaceRaised,
              borderWidth: 1,
              borderColor: isActive ? colors.accent : colors.borderMid,
            }}
          >
            {isToday && (
              <View style={{
                position: 'absolute',
                top: -1,
                marginLeft: 'auto',
                marginRight: 'auto',
                width: 0,
                height: 0,
                borderTopWidth: NOW_BUTTON_ARROW_SIZE,
                borderTopColor: colors.danger,
                borderRightWidth: NOW_BUTTON_ARROW_SIZE,
                borderLeftWidth: NOW_BUTTON_ARROW_SIZE,
                borderRightColor: 'transparent',
                borderLeftColor: 'transparent',
              }} />
            )}
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
