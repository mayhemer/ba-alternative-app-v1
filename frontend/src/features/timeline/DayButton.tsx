import React, { memo, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Text } from '../../ui/Text';
import { NOW_BUTTON_ARROW_SIZE } from './timelineLayout';
import { stripePath, CONFLICT_STRIPE } from '../../ui/stripes';
import { sameProps } from '../../ui/sameProps';
import type { DayButtonModel } from './DayButton.model';
import { colors } from '../../styling/tokens';

// ── A festival day button ─────────────────────────────────────────────────────
//
// Draws its model (DayButton.model.ts): the selected day is filled with the
// accent; today carries the red notch at its top; a clash day carries the
// timeline's conflict stripes on its right edge — a different shape from
// today's notch, so the two red marks never read as one.

const CLASH_MARK_WIDTH = 6;

// Drawn this tall and clipped by the Svg's own box, which spans the button's
// height: taller than any button, so the stripes always reach its bottom.
const BUTTON_HEIGHT_ESTIMATE = 60;

function ClashMark({ day }: { day: number }) {
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
          <Rect width={CLASH_MARK_WIDTH} height={BUTTON_HEIGHT_ESTIMATE} />
        </ClipPath>
      </Defs>
      <Rect width={CLASH_MARK_WIDTH} height={BUTTON_HEIGHT_ESTIMATE} fill={colors.danger} />
      <Path d={stripePath(CLASH_MARK_WIDTH, BUTTON_HEIGHT_ESTIMATE)} stroke={colors.dangerMuted} strokeWidth={CONFLICT_STRIPE} clipPath={`url(#${clipId})`} />
    </Svg>
  );
}

type Props = {
  item: DayButtonModel;
  /** Takes the day, so one stable callback serves every button. */
  onPick: (day: number) => void;
};

function DayButtonBase({ item, onPick }: Props) {
  const handlePress = useCallback((): void => { onPick(item.day); }, [onPick, item.day]);
  return (
    <TouchableOpacity
      testID={item.key}
      onPress={handlePress}
      accessibilityState={{ selected: item.selected }}
      style={{
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        backgroundColor: item.selected ? colors.accent : colors.surfaceRaised,
        borderWidth: 1,
        borderColor: item.selected ? colors.accent : colors.borderMid,
      }}
    >
      {item.today && (
        <View
          testID={`day-today-${item.day}`}
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
      {item.clash && <ClashMark day={item.day} />}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: item.selected ? colors.black : colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {item.weekday}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '400',
          color: item.selected ? colors.black : colors.textMuted,
        }}
      >
        {item.dayMonth}
      </Text>
    </TouchableOpacity>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const DayButton = memo(DayButtonBase, sameProps);
