import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';
import { INTEREST_CYCLE, type InterestStatus } from '../context/InterestContext';
import { StarGlyph, getFeedbackLabel } from './StarButton';
import { colors } from '../styling/tokens';

// ── InterestCycleStrip ────────────────────────────────────────────────────────
// Shows every interest state in tap order, the current one on a highlight disc
// and the rest dimmed: where the star is now and where the next tap takes it.
// Its label names the current state; `failed` appends a save warning to it.
// Colour does not tell the states apart, the shapes do: the other stars are
// black, the current one white on a dark disc.

const GLYPH_SIZE = 18;
const SLOT_SIZE = 28;
const SLOT_GAP = 8;
const DIMMED_OPACITY = 0.5;

type Props = {
  status: InterestStatus;
  failed?: boolean;
};

export function InterestCycleStrip({ status, failed = false }: Props) {
  const label = getFeedbackLabel(status);
  return (
    <View
      accessible
      accessibilityLabel={failed ? `${label}, not saved` : label}
      style={{ alignItems: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SLOT_GAP }}>
        {INTEREST_CYCLE.map((step) => (
          <View
            key={step}
            testID={step === status ? 'interest-cycle-current' : undefined}
            style={{
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              borderRadius: SLOT_SIZE / 2,
              backgroundColor: step === status ? colors.surfaceRaised : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: step === status ? 1 : DIMMED_OPACITY,
            }}
          >
            <StarGlyph status={step} size={GLYPH_SIZE} color={step === status ? colors.white : colors.black} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black, marginTop: 2 }}>
        {label}
        {failed && <Text style={{ color: colors.danger }}>  ⚠ not saved</Text>}
      </Text>
    </View>
  );
}
