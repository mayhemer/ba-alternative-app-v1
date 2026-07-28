import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { navigationRef } from '../../navigation/navigationRef';
import { useLensPanel } from '../../context/LensContext';
import { useLayoutMode } from '../../hooks/useLayoutMode';

const ICON_SIZE = 28;
const ICON_COLOR = '#f0f0f0';

/**
 * Hamburger that opens the navigation drawer. Lives in the TopBar normally and
 * in the BottomBar on short viewports, where the TopBar is not rendered — hence
 * a shared component rather than duplicating the panel coupling below.
 *
 * Renders nothing on wide screens, where the drawer is permanent.
 */
export function DrawerButton() {
  const { isWide } = useLayoutMode();
  const { close: closeLensPanel } = useLensPanel();

  // The drawer and the lens panel are mutually exclusive overlays — opening one
  // dismisses the other. The reverse direction lives in LensChip.
  const openDrawer = useCallback((): void => {
    closeLensPanel();
    navigationRef.dispatch(DrawerActions.openDrawer());
  }, [closeLensPanel]);

  if (isWide) { return null; }

  return (
    <TouchableOpacity onPress={openDrawer} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu">
      <Ionicons name="menu-outline" size={ICON_SIZE} color={ICON_COLOR} />
    </TouchableOpacity>
  );
}
