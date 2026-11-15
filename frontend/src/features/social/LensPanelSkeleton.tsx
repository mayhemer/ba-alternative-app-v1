import React, { useMemo } from 'react';
import { View } from 'react-native';
import { PanelSkeletonCard } from '../../ui/PanelSkeletonCard';
import { PanelSectionLabel } from '../../ui/PanelSectionLabel';
import { strings } from '../../i18n/strings';
import { panelSkeletonBorder } from '../../ui/PanelSkeletonCard.model';
import type { PullPreview } from '../../ui/PullPreview';
import { colors } from '../../styling/tokens';
import { useAuth } from '../../auth/AuthContext';
import { LENS_PANEL_CARD_PADDING } from './LensPanel';
import { lensPanelModel, type LensScopeRowModel } from './LensPanel.model';
import { LensScopeRow } from './LensScopeRow';
import { MyScheduleShareView } from './MyScheduleShare';
import { myScheduleShareModel, type MyScheduleShareModel } from './MyScheduleShare.model';
import { useLens } from './LensContext';
import { useSocialData } from './SocialContext';

// ── The lens panel's preview, pulled down from the top of a list ──────────────
//
// The panel itself as a mock: the same card in the same padding
// (LENS_PANEL_CARD_PADDING), laid out by the panel's own elements in their mock
// look (PanelSectionLabel, LensScopeRow, MyScheduleShareView): every text and
// icon, and a friend's avatar as a disc, in the mock's grey (colors.skeleton).
// The sources and the session are the
// panel's at the moment of the pull, so the preview has the panel's rows and
// height. Armed (ui/PullPreview), the card reacts as panelSkeletonBorder says.

const FILL = colors.skeleton;
const NO_OP = (): void => undefined;

type ViewProps = { rows: LensScopeRowModel[]; share: MyScheduleShareModel; armed: boolean };

export function LensPanelSkeletonView({ rows, share, armed }: ViewProps) {
  return (
    <PanelSkeletonCard
      testID="lens-panel-skeleton"
      borderColor={panelSkeletonBorder(armed, FILL)}
      padding={LENS_PANEL_CARD_PADDING}
    >
      <View>
        <PanelSectionLabel skeletonColor={FILL}>{strings().lensPanel.show}</PanelSectionLabel>
        {rows.map((row) => (
          <LensScopeRow
            key={row.key}
            item={row}
            onPress={NO_OP}
            onArm={NO_OP}
            onDisarm={NO_OP}
            onRemove={NO_OP}
            skeletonColor={FILL}
          />
        ))}
        <MyScheduleShareView
          item={share}
          busy={false}
          onSignIn={NO_OP}
          onShare={NO_OP}
          onCopy={NO_OP}
          onRevoke={NO_OP}
          skeletonColor={FILL}
        />
      </View>
    </PanelSkeletonCard>
  );
}

/** What a pull down past the artist list's or a timeline's top shows (ui/PullPreview). */
export const LensPanelSkeleton: PullPreview = ({ armed }) => {
  const { scope } = useLens();
  const { friends, myShare } = useSocialData();
  const { isLoggedIn } = useAuth();
  const rows = useMemo(() => lensPanelModel({ scope, friends, pendingRemove: null }).rows, [scope, friends]);
  const share = useMemo(() => myScheduleShareModel({ isLoggedIn, hasShare: myShare !== null }), [isLoggedIn, myShare]);
  return <LensPanelSkeletonView rows={rows} share={share} armed={armed} />;
};
