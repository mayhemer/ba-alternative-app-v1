import React, { memo } from 'react';
import { View } from 'react-native';
import { ConflictGroupTitle } from './PlanListItems';
import { sameProps } from './sameProps';
import type { PlanSpacerItem } from '../../utils/planUtils';
import type { DbEvent } from '../../types/backend';

// ── Room for a conflict title ─────────────────────────────────────────────────
//
// Above a clash group with no gap or cap over it: empty space that carries the
// group's "Conflict" title, so the title never covers the set above.

function PlanSpacerBase({ item, onPressConflict }: { item: PlanSpacerItem; onPressConflict: (event: DbEvent) => void }) {
  return (
    <View style={{ height: item.height }}>
      <ConflictGroupTitle event={item.conflictTitle} onPress={onPressConflict} />
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanSpacer = memo(PlanSpacerBase, sameProps);
