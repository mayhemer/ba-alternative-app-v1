import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ArtistListScreen } from '../screens/ArtistListScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { SupportTimelineScreen } from '../screens/SupportTimelineScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ConflictsScreen } from '../screens/ConflictsScreen';
import { SideDrawerContent } from '../components/layout/SideDrawerContent';
import { WIDE_SCREEN_WIDTH_BREAKPOINT } from '../styling/tokens';

export type DrawerParamList = {
  ArtistList: undefined;
  Timeline: undefined;
  SupportTimeline: undefined;
  Conflicts: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export function AppNavigator() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_SCREEN_WIDTH_BREAKPOINT;

  return (
    <Drawer.Navigator
      initialRouteName="ArtistList"
      drawerContent={(props) => <SideDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isWide ? 'permanent' : 'front',
        swipeEnabled: !isWide,
        swipeEdgeWidth: 20,     // edge-only gesture zone (px from left edge)
        overlayColor: isWide ? 'transparent' : 'rgba(0,0,0,0.6)',
        drawerStyle: {
          backgroundColor: 'transparent', // SideDrawerContent handles its own bg
          width: 260,
        },
      }}
    >
      <Drawer.Screen name="ArtistList"      component={ArtistListScreen} />
      <Drawer.Screen name="Timeline"        component={TimelineScreen} />
      <Drawer.Screen name="SupportTimeline" component={SupportTimelineScreen} />
      <Drawer.Screen name="Conflicts"       component={ConflictsScreen} />
      <Drawer.Screen name="Settings"        component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
