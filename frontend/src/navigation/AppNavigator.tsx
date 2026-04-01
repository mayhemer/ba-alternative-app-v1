import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ArtistListScreen } from '../screens/ArtistListScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SideDrawerContent } from '../components/layout/SideDrawerContent';

export type DrawerParamList = {
  ArtistList: undefined;
  Timeline: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export function AppNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="ArtistList"
      drawerContent={(props) => <SideDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 20,     // edge-only gesture zone (px from left edge)
        overlayColor: 'rgba(0,0,0,0.6)',
        drawerStyle: {
          backgroundColor: 'transparent', // SideDrawerContent handles its own bg
          width: 260,
        },
      }}
    >
      <Drawer.Screen name="ArtistList" component={ArtistListScreen} />
      <Drawer.Screen name="Timeline"   component={TimelineScreen} />
      <Drawer.Screen name="Settings"   component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
