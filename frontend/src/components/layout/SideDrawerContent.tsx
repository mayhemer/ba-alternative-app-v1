import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useConflicts } from '../../context/ConflictContext';
import { useSelectedSlug } from '../../store/AppContext';
import { useHasTimelineCategories } from '../../store/cacheStore';
import { DrawerItem } from './DrawerItem';
import { drawerItemModels } from './SideDrawerContent.model';

// ── The navigation drawer ─────────────────────────────────────────────────────
//
// Reads what decides its entries — the active screen, whether each timeline
// has categories to build lanes from, the clash count — and draws one
// DrawerItem per model (SideDrawerContent.model.ts).

export function SideDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const activeRoute = state.routes[state.index]?.name;
  const { count: conflictCount } = useConflicts();
  const slug = useSelectedSlug();
  const hasProgram = useHasTimelineCategories(slug, true);
  const hasSupportProgram = useHasTimelineCategories(slug, false);

  const items = useMemo(
    () => drawerItemModels({ activeRoute, hasProgram, hasSupportProgram, conflictCount }),
    [activeRoute, hasProgram, hasSupportProgram, conflictCount],
  );

  const handlePress = useCallback((screen: string): void => {
    navigation.navigate(screen);
    navigation.dispatch(DrawerActions.closeDrawer());
  }, [navigation]);

  return (
    <View className="flex-1 bg-surface px-6">
      {items.map((item) => <DrawerItem key={item.key} item={item} onPress={handlePress} />)}
    </View>
  );
}
