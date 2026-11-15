import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useLayoutMode } from '../hooks/useLayoutMode';
import {
  colors,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_MAX_WIDTH,
  OVERLAY_PANEL_RADIUS,
} from '../styling/tokens';

// ── An overlay panel's card, as a loading skeleton ────────────────────────────
//
// Where the lens and filter panels put their card (OVERLAY_PANEL_MARGIN under
// the top bar and in from the edges; pinned right at OVERLAY_PANEL_MAX_WIDTH on
// a wide screen), on the same surface, with the same 1 pt border, outlined in
// `borderColor`. A pull preview (ui/PullPreview) draws the panel it opens in it,
// in the panel's own padding.

type Props = {
  testID?: string;
  borderColor: string;
  /** The panel card's own padding. */
  padding: Pick<ViewStyle, 'padding' | 'paddingHorizontal' | 'paddingTop' | 'paddingBottom'>;
  /** A fixed height, its border included; else it fits its content, as the panel does. */
  height?: number;
  children: React.ReactNode;
};

export function PanelSkeletonCard({ testID, borderColor, padding, height, children }: Props) {
  const { isWide } = useLayoutMode();
  return (
    <View
      testID={testID}
      style={{
        marginTop: OVERLAY_PANEL_MARGIN,
        marginLeft: isWide ? undefined : OVERLAY_PANEL_MARGIN,
        marginRight: OVERLAY_PANEL_MARGIN,
        alignSelf: isWide ? 'flex-end' : 'stretch',
        width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
        height,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor,
        borderRadius: OVERLAY_PANEL_RADIUS,
        ...padding,
      }}
    >
      {children}
    </View>
  );
}
