import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { sameProps } from '../sameProps';
import type { DrawerItemModel } from './SideDrawerContent.model';
import { colors } from '../../styling/tokens';

// ── One entry of the navigation drawer ────────────────────────────────────────
//
// Draws its model (SideDrawerContent.model.ts): the label, accent while active,
// and My plan's clash marker — a red warning sign and the count. The sign says
// what is counted (a bare number next to "My plan" would not) and is the one
// the plan uses for its conflict titles.

type Props = {
  item: DrawerItemModel;
  onPress: (screen: string) => void;
};

function DrawerItemBase({ item, onPress }: Props) {
  return (
    <TouchableOpacity
      testID={`drawer-item-${item.key}`}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      onPress={() => onPress(item.key)}
      className="py-4 border-b border-border"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          className={
            item.active
              ? 'text-accent text-base font-semibold tracking-wide'
              : 'text-textPrimary text-base tracking-wide'
          }
        >
          {item.label}
        </Text>
        {item.marker !== null && (
          <View testID="drawer-conflict-marker" style={{ marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="warning-outline" size={15} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 13, fontFamily: 'Bold-Default', fontWeight: '700' }}>{item.marker}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const DrawerItem = memo(DrawerItemBase, sameProps);
