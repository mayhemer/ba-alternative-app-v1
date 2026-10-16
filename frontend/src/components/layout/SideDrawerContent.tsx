import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useConflicts } from '../../context/ConflictContext';
import { useSelectedSlug } from '../../store/AppContext';
import { useHasTimelineCategories } from '../../store/cacheStore';
import { planStrings } from '../plan/planStrings';
import { colors } from '../../styling/tokens';

type NavItem = {
  label: string;
  screen: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: planStrings().title, screen: 'MyPlan' },
  { label: 'Artists',           screen: 'ArtistList' },
  { label: 'Program',           screen: 'Timeline' },
  { label: 'Support Program',   screen: 'SupportTimeline' },
  { label: 'Settings',          screen: 'Settings' },
];

/**
 * My plan's clash marker: a red warning sign and the number of clashing
 * Must-see sets. The sign says what is counted — a bare number next to "My
 * plan" would not — and is the same one the plan uses for its conflict titles.
 */
function ConflictMarker({ count }: { count: number }) {
  return (
    <View testID="drawer-conflict-marker" style={{ marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="warning-outline" size={15} color={colors.danger} />
      <Text style={{ color: colors.danger, fontSize: 13, fontFamily: 'Bold-Default', fontWeight: '700' }}>{count}</Text>
    </View>
  );
}

export function SideDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const activeRouteName = state.routes[state.index]?.name;
  const { count: conflictCount } = useConflicts();
  const slug = useSelectedSlug();
  const hasProgram = useHasTimelineCategories(slug, true);
  const hasSupportProgram = useHasTimelineCategories(slug, false);

  // A timeline screen is listed only when there are categories to build its
  // lanes from for the artists it shows.
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => {
      if (item.screen === 'Timeline') { return hasProgram; }
      if (item.screen === 'SupportTimeline') { return hasSupportProgram; }
      return true;
    }),
    [hasProgram, hasSupportProgram],
  );

  return (
    <View className="flex-1 bg-surface px-6">
      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = item.screen === activeRouteName;
        const showMarker = item.screen === 'MyPlan' && conflictCount > 0;
        const label = showMarker ? `${item.label}, ${planStrings().conflictsLabel(conflictCount)}` : item.label;
        return (
          <TouchableOpacity
            key={item.screen}
            testID={`drawer-item-${item.screen}`}
            accessibilityRole="button"
            accessibilityLabel={label}
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
              {showMarker && <ConflictMarker count={conflictCount} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
