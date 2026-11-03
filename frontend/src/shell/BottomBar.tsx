import React, { memo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenUI } from './ScreenUIContext';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { DrawerButton } from './DrawerButton';
import { bottomBarInSight, bottomBarMode } from './BottomBar.model';
import { useSearch } from '../features/search/SearchContext';
import { useLensPanel } from '../features/social/LensContext';
import { usePlanPanel } from '../screens/my-plan/PlanContext';
import { colors, DAY_SWITCHER_MAX_FRACTION } from '../styling/tokens';

// Reserve matching space on both sides so the screen's own content stays
// centred regardless of whether the right slot is filled.
const SIDE_SLOT_WIDTH = 40;

// Room above the row for the scrim to fade in over the content behind it.
const SCRIM_FADE_HEIGHT = 24;

// The slots, memoised: hiding or showing the bar renders none of what is in it.
const Slot = memo(function Slot({ Component }: { Component: React.ComponentType | undefined }) {
  return Component !== undefined ? <Component /> : null;
});
const DrawerButtonSlot = memo(DrawerButton);

// Out of sight while the search field holds the bottom edge, but still laid
// out: the screen above keeps its height. Hidden from touch and screen readers too.
const OUT_OF_SIGHT: Pick<ViewProps, 'pointerEvents' | 'accessibilityElementsHidden' | 'importantForAccessibility'> = {
  pointerEvents: 'none',
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
};

export function BottomBar() {
  const { state } = useScreenUI();
  const { ContentComponent } = state.bottomBar;
  const { RightComponent } = state.topBar;
  const { isShort, width } = useLayoutMode();
  const { isOpen: searchOpen } = useSearch();
  const { isOpen: lensPanelOpen } = useLensPanel();
  const { isOpen: planPanelOpen } = usePlanPanel();
  const inSight = bottomBarInSight({ searchOpen, lensPanelOpen, planPanelOpen });
  const hiding = inSight ? null : OUT_OF_SIGHT;
  const opacity = inSight ? 1 : 0;

  // On short viewports the TopBar is not rendered, so this bar carries its
  // controls — which means it must appear even on screens that contribute no
  // content of their own (Settings, ArtistList). See BottomBar.model.ts.
  const mode = bottomBarMode({ hasContent: ContentComponent !== undefined, isShort });
  if (mode === 'hidden') {
    return null;
  }

  // Portrait: a solid row in the flex column, below the content.
  if (mode === 'row') {
    return (
      <View className="bg-surface border-t border-border px-4 py-3" style={{ opacity }} {...hiding}>
        <Slot Component={ContentComponent} />
      </View>
    );
  }

  // Landscape: floats over the content, anchored to the bottom. Mounted inside
  // the content view by AppShell. The day buttons carry their own opaque
  // backgrounds, but the bare hamburger and lens icons need the scrim to stay
  // legible over a bright lane block.
  return (
    <View
      className="px-4 flex-row items-center"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: SCRIM_FADE_HEIGHT,
        paddingBottom: 12,
        justifyContent: 'space-between',
        opacity,
      }}
      {...hiding}
    >
      <LinearGradient
        colors={['transparent', colors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-start">
        <DrawerButtonSlot />
      </View>

      <View style={{ flex: 1, maxWidth: width * DAY_SWITCHER_MAX_FRACTION }}>
        <Slot Component={ContentComponent} />
      </View>

      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-end">
        <Slot Component={RightComponent} />
      </View>
    </View>
  );
}
