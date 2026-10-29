import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ArtistListScreen } from '../screens/artist-list/ArtistListScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { SupportTimelineScreen } from '../screens/timeline/SupportTimelineScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { MyPlanScreen } from '../screens/my-plan/MyPlanScreen';
import { SideDrawerContent } from '../shell/SideDrawerContent';
import { useLayoutMode } from '../hooks/useLayoutMode';

export type DrawerParamList = {
  MyPlan: undefined;
  ArtistList: undefined;
  Timeline: undefined;
  SupportTimeline: undefined;
  Settings: undefined;
};

/** Every route the drawer has — what a restored navigation state may name. */
export const DRAWER_ROUTE_NAMES: readonly (keyof DrawerParamList)[] = [
  'MyPlan',
  'ArtistList',
  'Timeline',
  'SupportTimeline',
  'Settings',
];

const Drawer = createDrawerNavigator<DrawerParamList>();

export function AppNavigator() {
  const { isWide } = useLayoutMode();

  return (
    <Drawer.Navigator
      initialRouteName="ArtistList"
      drawerContent={(props) => <SideDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isWide ? 'permanent' : 'front',
        // The selected festival day is shared by both timeline screens, so a day
        // switch re-rendered the *other* one's whole canvas too once it had been
        // visited — the same second of blocked UI thread, paid twice, for
        // something off screen. Freezing blurred screens defers that until the
        // screen is actually shown again.
        freezeOnBlur: true,
        swipeEnabled: !isWide,
        swipeEdgeWidth: 20,     // edge-only gesture zone (px from left edge)
        overlayColor: isWide ? 'transparent' : 'rgba(0,0,0,0.6)',
        drawerStyle: {
          backgroundColor: 'transparent', // SideDrawerContent handles its own bg
          width: 260,
        },
      }}
    >
      <Drawer.Screen name="MyPlan"          component={MyPlanScreen} />
      <Drawer.Screen name="ArtistList"      component={ArtistListScreen} />
      <Drawer.Screen name="Timeline"        component={TimelineScreen} />
      <Drawer.Screen name="SupportTimeline" component={SupportTimelineScreen} />
      <Drawer.Screen name="Settings"        component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
