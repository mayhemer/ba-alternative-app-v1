import React from 'react';
import { View } from 'react-native';
import { MAX_CONTENT_WIDTH } from '../../styling/tokens';
import { DayButton } from './DayButton';
import type { DayButtonModel } from './DayButton.model';

// ── The festival day buttons ──────────────────────────────────────────────────
//
// Presentational, shared by the timeline's DaySwitcher and My plan's day
// switcher: each owns which day is shown, which is today, which days are marked
// and what a tap does, and hands the buttons in as models (DayButton.model.ts).

type Props = {
  buttons: DayButtonModel[];
  onPick: (day: number) => void;
};

export function DayButtons({ buttons, onPick }: Props) {
  return (
    <View style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 8 }}>
      {buttons.map((button) => <DayButton key={button.key} item={button} onPick={onPick} />)}
    </View>
  );
}
