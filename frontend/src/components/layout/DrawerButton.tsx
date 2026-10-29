import React from 'react';
import { TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { toggleDrawer, useIsDrawerOpen } from '../../navigation/drawerOverlay';
import { useLayoutMode } from '../../hooks/useLayoutMode';

const ICON_SIZE = 28;
const ICON_COLOR = '#f0f0f0';

/**
 * Hamburger that opens the navigation drawer, or closes it when open. Lives in
 * the TopBar normally and in the BottomBar on short viewports, where the TopBar
 * is not rendered — hence a shared component rather than two copies.
 *
 * Dismissing whatever else is open is the exclusivity hub's job, reached through
 * toggleDrawer — see utils/overlayHub.
 *
 * Its label says what a tap does, so it follows the drawer's open state.
 *
 * Renders nothing on wide screens, where the drawer is permanent.
 */
export function DrawerButton() {
  const { isWide } = useLayoutMode();
  const isOpen = useIsDrawerOpen();

  if (isWide) { return null; }

  return (
    <TouchableOpacity
      onPress={toggleDrawer}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? 'Close menu' : 'Open menu'}
    >
      <Ionicons name="menu-outline" size={ICON_SIZE} color={ICON_COLOR} />
    </TouchableOpacity>
  );
}
