import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useConflicts } from '../../context/ConflictContext';
import { colors } from '../../styling/tokens';

type NavItem = {
  label: string;
  screen: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Artists',         screen: 'ArtistList' },
  { label: 'Program',         screen: 'Timeline' },
  { label: 'Support Program', screen: 'SupportTimeline' },
  { label: 'Conflicts',       screen: 'Conflicts' },
  { label: 'Settings',        screen: 'Settings' },
];

export function SideDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const activeRouteName = state.routes[state.index]?.name;
  const { count: conflictCount } = useConflicts();

  return (
    <View className="flex-1 bg-surface pt-12 pb-8 px-6">
      {/* App label */}
      <Text className="text-textSecondary text-xs tracking-widest uppercase mb-8">
        Brutal Assault
      </Text>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const isActive = item.screen === activeRouteName;
        return (
          <TouchableOpacity
            key={item.screen}
            onPress={() => {
              navigation.navigate(item.screen);
              navigation.dispatch(DrawerActions.closeDrawer());
            }}
            className="py-4 border-b border-border"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                className={
                  isActive
                    ? 'text-accent text-base font-semibold tracking-wide'
                    : 'text-textPrimary text-base tracking-wide'
                }
              >
                {item.label}
              </Text>
              {item.screen === 'Conflicts' && conflictCount > 0 && (
                <View style={{
                  marginLeft: 8,
                  backgroundColor: colors.danger,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 5,
                }}>
                  <Text style={{ color: colors.white, fontSize: 11, fontWeight: '700', lineHeight: 14 }}>
                    {conflictCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
