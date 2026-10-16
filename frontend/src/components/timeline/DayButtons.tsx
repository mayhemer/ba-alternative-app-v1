import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import { CONTENT_MAX_WIDTH, NOW_BUTTON_ARROW_SIZE, formatDayMonth, formatWeekday } from './timelineLayout';
import { stripePath, CONFLICT_STRIPE } from './ArtistBlock';
import { colors } from '../../styling/tokens';

// ── The festival day buttons ──────────────────────────────────────────────────
//
// Presentational, shared by the timeline's DaySwitcher and My plan's day
// switcher: each owns which day is shown and what a tap does. The selected day
// is filled with the accent; today carries the red notch at its top. My plan can
// also mark days (conflicts-only mode: days with a clash) with the timeline's
// conflict stripes on the button's right edge — a different shape from today's
// notch, so the two red marks never read as one.

const CLASH_MARK_WIDTH = 6;

type Props = {
  days: number[];
  selected: number;
  /** The festival day that contains now, or null outside the festival. */
  today: number | null;
  onPick: (day: number) => void;
  /** Days to mark with the clash stripe. */
  marked?: ReadonlySet<number>;
};

function ClashMark({ day, height }: { day: number; height: number }) {
  const clipId = `dayClash-${day}`;
  return (
    <Svg
      testID={`day-clash-${day}`}
      pointerEvents="none"
      width={CLASH_MARK_WIDTH}
      height="100%"
      style={{ position: 'absolute', top: 0, bottom: 0, right: 0 }}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Rect width={CLASH_MARK_WIDTH} height={height} />
        </ClipPath>
      </Defs>
      <Rect width={CLASH_MARK_WIDTH} height={height} fill={colors.danger} />
      <Path d={stripePath(CLASH_MARK_WIDTH, height)} stroke={colors.dangerMuted} strokeWidth={CONFLICT_STRIPE} clipPath={`url(#${clipId})`} />
    </Svg>
  );
}

// Drawn this tall and clipped by the Svg's own box, which spans the button's
// height: taller than any button, so the stripes always reach its bottom.
const BUTTON_HEIGHT_ESTIMATE = 60;

export function DayButtons({ days, selected, today, onPick, marked }: Props) {
  return (
    <View style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 8 }}>
      {days.map((dayStart) => {
        const isActive = dayStart === selected;
        const isToday = dayStart === today;
        return (
          <TouchableOpacity
            key={dayStart}
            onPress={() => { onPick(dayStart); }}
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
              <View
                testID={`day-today-${dayStart}`}
                style={{
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
                }}
              />
            )}
            {marked?.has(dayStart) === true && <ClashMark day={dayStart} height={BUTTON_HEIGHT_ESTIMATE} />}
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
              {formatDayMonth(dayStart)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
