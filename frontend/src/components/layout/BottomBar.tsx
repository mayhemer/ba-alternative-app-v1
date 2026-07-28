import React from 'react';
import { View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { DrawerButton } from './DrawerButton';

// Reserve matching space on both sides so the screen's own content stays
// centred regardless of whether the right slot is filled.
const SIDE_SLOT_WIDTH = 40;

export function BottomBar() {
  const { state } = useScreenUI();
  const { ContentComponent } = state.bottomBar;
  const { RightComponent } = state.topBar;
  const { isShort } = useLayoutMode();

  // On short viewports the TopBar is not rendered, so this bar carries its
  // controls — which means it must appear even on screens that contribute no
  // content of their own (Conflicts, Settings, ArtistList).
  if (ContentComponent === undefined && !isShort) {
    return null;
  }

  if (!isShort) {
    return (
      <View className="bg-surface border-t border-border px-4 py-3">
        {ContentComponent !== undefined ? <ContentComponent /> : null}
      </View>
    );
  }

  return (
    <View className="bg-surface border-t border-border px-4 py-3 flex-row items-center">
      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-start">
        <DrawerButton />
      </View>

      <View className="flex-1">
        {ContentComponent !== undefined ? <ContentComponent /> : null}
      </View>

      <View style={{ width: SIDE_SLOT_WIDTH }} className="items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>
    </View>
  );
}
