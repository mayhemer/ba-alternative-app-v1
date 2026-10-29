import React from 'react';
import { View } from 'react-native';
import { useScreenUI } from './ScreenUIContext';
import { DrawerButton } from './DrawerButton';
import { NowPill } from '../screens/my-plan/NowPill';
import { TOPBAR_HEIGHT } from '../styling/tokens';

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;
  const { LeftComponent, RightComponent } = topBar;

  return (
    <View
      className="flex-row items-center bg-surface border-b border-border px-4"
      style={{ height: TOPBAR_HEIGHT }}
    >

      {/* Left slot — DrawerButton renders nothing on wide screens (drawer is permanent); LeftComponent layered after if set.
          The side slots are 56 pt; the widest controls in them, the lens and filter chips (TopBarChip), are 38 pt,
          right-aligned, which leaves the now pill room on its right. */}
      <View className="w-14 items-start">
        <DrawerButton />
        {LeftComponent !== undefined ? <LeftComponent /> : null}
      </View>

      {/* Center — the now pill: what is on for you right now, or the logo when
          there is nothing to say (see screens/my-plan/NowPill) */}
      <View className="flex-1 items-center">
        <NowPill />
      </View>

      {/* Right slot */}
      <View className="w-14 items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>

    </View>
  );
}
