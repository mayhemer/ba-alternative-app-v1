import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './ui/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InterestStatus } from '../context/InterestContext';
import { useArtistListFilter } from '../context/ArtistListFilterContext';
import { colors } from '../styling/tokens';

// Module-level component — registered as TopBar RightComponent.
// Reads its own context directly; no props needed.

type FilterButton = {
  status: InterestStatus | null;
  label: string;
};

const FILTER_BUTTONS: FilterButton[] = [
  { status: null,       label: 'All'      },
  { status: 'maybe',    label: 'Maybe'    },
  { status: 'must_see', label: 'Must see' },
];

export function InterestFilterControl() {
  const { interestFilter, setInterestFilter } = useArtistListFilter();

  return (
    <View className="flex-row items-center gap-1">
      {FILTER_BUTTONS.map((btn) => {
        const isActive = interestFilter === btn.status;
        const iconColor = isActive ? colors.accent : colors.muted;
        return (
          <TouchableOpacity
            key={btn.label}
            onPress={() => setInterestFilter(btn.status)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel={btn.label}
            accessibilityRole="button"
          >
            {btn.status === null && (
              <Text style={{ fontSize: 28, color: iconColor }}>≡</Text>
            )}
            {btn.status === 'maybe' && (
              <Ionicons name="star-outline" size={16} color={iconColor} />
            )}
            {btn.status === 'must_see' && (
              <Ionicons name="star" size={16} color={iconColor} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
