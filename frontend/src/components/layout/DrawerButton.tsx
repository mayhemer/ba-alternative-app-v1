import React from 'react';
import { TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { openDrawer } from '../../navigation/drawerOverlay';
import { useLayoutMode } from '../../hooks/useLayoutMode';

const ICON_SIZE = 28;
const ICON_COLOR = '#f0f0f0';

/**
 * Hamburger that opens the navigation drawer. Lives in the TopBar normally and
 * in the BottomBar on short viewports, where the TopBar is not rendered — hence
 * a shared component rather than two copies.
 *
 * Dismissing whatever else is open is the exclusivity hub's job, reached through
 * openDrawer — see utils/overlayHub.
 *
 * Renders nothing on wide screens, where the drawer is permanent.
 */
export function DrawerButton() {
  const { isWide } = useLayoutMode();

  if (isWide) { return null; }

  return (
    <TouchableOpacity onPress={openDrawer} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu">
      <Ionicons name="menu-outline" size={ICON_SIZE} color={ICON_COLOR} />
    </TouchableOpacity>
  );
}
