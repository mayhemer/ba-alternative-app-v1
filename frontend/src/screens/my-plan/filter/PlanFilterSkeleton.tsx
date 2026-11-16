import React, { useMemo } from 'react';
import { View } from 'react-native';
import { PanelSkeletonCard } from '../../../ui/PanelSkeletonCard';
import { PanelSectionLabel } from '../../../ui/PanelSectionLabel';
import type { PullPreview } from '../../../ui/PullPreview';
import { strings } from '../../../i18n/strings';
import { planFilterSkeletonModel } from './PlanFilterSkeleton.model';
import { PlanFilterLevel } from './PlanFilterLevel';
import { FILTER_PANEL_PADDING } from './PlanFilterLevel.model';

// ── The filter panel's preview, drawn ─────────────────────────────────────────
//
// Draws its model (PlanFilterSkeleton.model.ts): the card, the heading and the
// four rows, by the panel's own elements in their mock look.

const PADDING = { padding: FILTER_PANEL_PADDING };
const NO_OP = (): void => undefined;

function PlanFilterSkeletonBase({ armed }: { armed: boolean }) {
  const model = useMemo(() => planFilterSkeletonModel(armed), [armed]);
  return (
    <PanelSkeletonCard borderColor={model.borderColor} padding={PADDING}>
      <View testID="plan-filter-skeleton">
        <PanelSectionLabel skeletonColor={model.textColor}>{strings().planFilter.heading}</PanelSectionLabel>
        {model.levels.map((item) => (
          <PlanFilterLevel key={item.key} item={item} onPick={NO_OP} skeletonColor={model.textColor} />
        ))}
      </View>
    </PanelSkeletonCard>
  );
}

/** What a pull down past My plan's top shows (ui/PullPreview). */
export const PlanFilterSkeleton: PullPreview = PlanFilterSkeletonBase;
