import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '../../ui/Text';
import { LIST_GUTTER } from './planStyles';
import { sameProps } from '../../ui/sameProps';
import type { PlanEmptyModel } from './PlanEmpty.model';
import { colors } from '../../styling/tokens';

// ── An empty day ──────────────────────────────────────────────────────────────

function PlanEmptyBase({ item }: { item: PlanEmptyModel }) {
  return (
    <View style={{ height: item.height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: LIST_GUTTER }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>{item.text}</Text>
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanEmpty = memo(PlanEmptyBase, sameProps);
