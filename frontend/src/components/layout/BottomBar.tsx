import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenUI } from '../../context/ScreenUIContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { DrawerButton } from './DrawerButton';
import { colors, DAY_SWITCHER_MAX_FRACTION } from '../../styling/tokens';

// Reserve matching space on both sides so the screen's own content stays
// centred regardless of whether the right slot is filled.
const SIDE_SLOT_WIDTH = 40;

// Room above the row for the scrim to fade in over the content behind it.
const SCRIM_FADE_HEIGHT = 24;

export function BottomBar() {
  const { state } = useScreenUI();
  const { ContentComponent } = state.bottomBar;
  const { RightComponent } = state.topBar;
  const { isShort, width } = useLayoutMode();

  // On short viewports the TopBar is not rendered, so this bar carries its
  // controls — which means it must appear even on screens that contribute no
  // content of their own (Conflicts, Settings, ArtistList).
  if (ContentComponent === undefined && !isShort) {
    return null;
  }

  // Portrait: a solid row in the flex column, below the content.
  if (!isShort) {
    return (
      <View className="bg-surface border-t border-border px-4 py-3">
        {ContentComponent !== undefined ? <ContentComponent /> : null}
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
      }}
    >
      <LinearGradient
        colors={['transparent', colors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-start">
        <DrawerButton />
      </View>

      <View style={{ flex: 1, maxWidth: width * DAY_SWITCHER_MAX_FRACTION }}>
        {ContentComponent !== undefined ? <ContentComponent /> : null}
      </View>

      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>
    </View>
  );
}
