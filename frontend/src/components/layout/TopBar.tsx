import React from 'react';
import { View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';
import { DrawerButton } from './DrawerButton';
import { NowPill } from '../plan/NowPill';
import { TOPBAR_HEIGHT } from '../../styling/tokens';

export function TopBar() {
  const { state } = useScreenUI();
  const { topBar } = state;
  const { LeftComponent, RightComponent } = topBar;

  return (
    <View
      className="flex-row items-center bg-surface border-b border-border px-4"
      style={{ height: TOPBAR_HEIGHT }}
    >

      {/* Left slot — DrawerButton renders nothing on wide screens (drawer is permanent); LeftComponent layered after if set */}
      <View className="w-16 items-start">
        <DrawerButton />
        {LeftComponent !== undefined ? <LeftComponent /> : null}
      </View>

      {/* Center — the now pill: what is on for you right now, or the logo when
          there is nothing to say (see components/plan/NowPill) */}
      <View className="flex-1 items-center">
        <NowPill />
      </View>

      {/* Right slot */}
      <View className="w-16 items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>

    </View>
  );
}
